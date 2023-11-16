// Create a scope, to avoid polluting the global namespace
// Pass in the window object, to apply the applyViewModel function to
(function(global) {
  const functionNameBindings = [ 'click', 'change', 'input', 'keyup', 'keydown', 'keypress', 'focus', 'blur', 'load' ];
  const propertyNameBindings = [ 'value', 'checked', 'selected', 'disabled', 'innerHTML', 'textContent', 'src' ];
  const classNameBindings = [ 'css' ];
  const elementNameBindings = [ 'id' ];

  const registeredElements = [];
  const registeredViewModels = {};

  const http = {
    /**
     * @template T
     * @param {string} url
     * @returns {Promise<T>}
     */
    async get(url) {
      return fetch(url).then(resp => resp.json());
    },
    /**
     * @template T
     * @param {string} url
     * @param {{[key: string]: any}} data
     * @returns {Promise<T>}
     */
    async post(url, data) {
      return fetch(url, {
        method: 'POST',
        body: JSON.stringify(data)
      }).then(resp => resp.json());
    },
    /**
     * @template T
     * @param {string} url
     * @param {{ [key: string]: any }} data
     * @returns {Promise<T>}
     */
    async put(url, data) {
      return fetch(url, {
        method: 'PUT',
        body: JSON.stringify(data)
      }).then(resp => resp.json());
    },
    /**
     * @template T
     * @param {string} url
     * @returns {Promise<T>}
     */
    async delete(url) {
      return fetch(url, {
        method: 'DELETE'
      }).then(resp => resp.json());
    }
  };

  const internals = {
    /**
     * @param {string} viewModelName
     * @throws {Error}
     * @return {void}
     */
    removeViewModel( viewModelName ) {
      if (!registeredViewModels[viewModelName]) {
        throw new Error(`The scope "${viewModelName}" has not been registered`);
      }
  
      delete registeredViewModels[viewModelName];
    },
    /**
     * @param {string} oldViewModelName
     * @param {string} newViewModelName
     * @throws {Error}
     * @returns {void}
     */
    moveViewModel( oldViewModelName, newViewModelName ) {
      if (!registeredViewModels[oldViewModelName]) {
        throw new Error(`The scope "${oldViewModelName}" has not been registered`);
      }

      if (registeredViewModels[newViewModelName]) {
        throw new Error(`The scope "${newViewModelName}" has already been registered`);
      }

      registeredViewModels[newViewModelName] = registeredViewModels[oldViewModelName];
      delete registeredViewModels[oldViewModelName];
    },
    /**
     * @param {string} oldViewModelName
     * @param {string} newViewModelName
     * @returns {void}
     */
    copyViewModel( oldViewModelName, newViewModelName ) {
      registeredViewModels[newViewModelName] = registeredViewModels[oldViewModelName];
    }
  };

  /**
   * @param {string} scopeName
   * @param {({
   *   $scope: { [key: string]: any },
   *   $elements: { [key: string]: HTMLElement },
   *   $internals: typeof internals,
   *   $http: typeof http
   * }) => void} viewModelFunction
   * @throws {Error}
   * @returns {void}
   */
  function applyViewModel( scopeName, viewModelFunction ) {
    if (registeredViewModels[scopeName]) {
      throw new Error(`The scope "${scopeName}" has already been registered`);
    }

    registeredViewModels[scopeName] = {
      viewModelValueBindings: {},
      viewModelElements: {},
      viewModelScope: {}
    };

    registeredViewModels[scopeName].viewModelProxy = new Proxy(registeredViewModels[scopeName].viewModelScope, {
      get(target, property) {
        return target[property];
      },
      set(target, property, value) {
        target[property] = value;

        if (Object.hasOwn(registeredViewModels[scopeName].viewModelValueBindings, property)) {
          for (const binding of registeredViewModels[scopeName].viewModelValueBindings[property]) {
            if (binding.class) {
              const expression = new Function('$scope', `return ${binding.expression}`);
              const expressionResult = expression(registeredViewModels[scopeName].viewModelProxy);

              if (expressionResult) {
                binding.element.classList.add(binding.class);
              } else {
                binding.element.classList.remove(binding.class);
              }
            } else if (value !== null && value !== undefined) {
              binding.element[binding.binding] = binding.predicate ? binding.predicate(value) : value;
            }
          }
        }

        return true;
      }
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        loadBindings(scopeName, viewModelFunction);
      });
    } else {
      loadBindings(scopeName, viewModelFunction);
    }
  }

  /**
   * @param {string} registeredScopeName
   * @param {({
   *   $scope: { [key: string]: any },
   *   $elements: { [key: string]: HTMLElement },
   *   $internals: typeof internals,
   *   $http: typeof http
   * }) => void} viewModelFunction
   * @throws {Error}
   * @returns {void}
   */
  function loadBindings( registeredScopeName, viewModelFunction ) {
    document.querySelectorAll('[data-bind]').forEach(function(element) {
      if (registeredElements.includes(element)) {
        return console.log(`Element already registered... skipping`, element);
      }

      registeredElements.push(element);

      const attribute = element.dataset.bind;

      // Walk up recursively until we find the data-bind with the scope name
      let scopeName = null;
      let parent = element;
      while (parent) {
        if (parent.dataset.bind && parent.dataset.bind.startsWith('scope:')) {
          scopeName = parent.dataset.bind.replace(/scope: ?/i, '');
          break;
        }

        parent = parent.parentElement;
      }

      if (!scopeName) {
        throw new Error(`No scope name found for element with data-bind attribute '${attribute}'`);
      }

      attribute.split(',').forEach(function(bindingSection) {

        const bindingLeftSide = bindingSection.split(':')[0].trim();
        const bindingRightSide = bindingSection.split(':')?.[1]?.trim();

        if (classNameBindings.includes(bindingLeftSide) && bindingRightSide) {
          const fullRightSideBinding = bindingSection.split(':').slice(1).join(':').trim();

          // Regular expression to match the pattern '{ key: valueExpression }'
          const regex = /\{\s*([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*:\s*([^}]+)\s*\}/;

          // Use the regular expression to match and extract key and valueExpression
          const match = fullRightSideBinding.match(regex);

          let key = null;
          let valueExpression = null;

          // Check if there is a match
          if (match) {
            key = match[1];
            valueExpression = match[2];
          }

          if (!key || !valueExpression) {
            throw new Error(`Invalid css binding: ${bindingRightSide}`);
          }

          // Regular expression to match values starting with $scope.
          const variableRegex = /\$scope\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g;

          // Use the regular expression to find all matches in the input string
          const matches = valueExpression.match(variableRegex);

          // Check if there are matches
          const extractedValues = matches.map(match => match.replace('$scope.', ''));

          if (extractedValues.length === 0) {
            throw new Error(`Invalid css binding: ${bindingRightSide}`);
          }

          // key contains e.g. 'd-none'
          // valueExpression contains e.g. '$scope.isHidden'
          // extractedValues contains e.g. ['isHidden', 'blogTitelbild']

          for (const value of extractedValues) {
            if (Object.hasOwn(registeredViewModels[scopeName].viewModelValueBindings, value)) {
              registeredViewModels[scopeName].viewModelValueBindings[value].push({
                class: key,
                element: element,
                expression: valueExpression
              });
            } else {
              registeredViewModels[scopeName].viewModelValueBindings[value] = [{
                class: key,
                element: element,
                expression: valueExpression
              }];
            }
          }
        }

        if (elementNameBindings.includes(bindingLeftSide) && bindingRightSide) {
          registeredViewModels[scopeName].viewModelElements[bindingRightSide] = element;
          return;
        }

        if (functionNameBindings.includes(bindingLeftSide) && bindingRightSide) {
          element.addEventListener(bindingLeftSide, function(event) {
            registeredViewModels[scopeName].viewModelProxy[bindingRightSide](event);
          });
          return;
        }

        if (propertyNameBindings.includes(bindingLeftSide) && bindingRightSide) {
          if (Object.hasOwn(registeredViewModels[scopeName].viewModelValueBindings, bindingRightSide)) {
            registeredViewModels[scopeName].viewModelValueBindings[bindingRightSide].push({
              binding: bindingLeftSide,
              element: element
            });
          } else {
            registeredViewModels[scopeName].viewModelValueBindings[bindingRightSide] = [{
              binding: bindingLeftSide,
              element: element
            }];
          }
        }
      });
    });

    viewModelFunction({
      $scope: registeredViewModels[registeredScopeName].viewModelProxy,
      $elements: registeredViewModels[registeredScopeName].viewModelElements,
      $internals: internals,
      $http: http
    });
    registeredViewModels[registeredScopeName].viewModelProxy.initialize?.();
  }

  global.applyViewModel = applyViewModel;
  global.registeredElements = registeredElements;
  global.registeredViewModels = registeredViewModels;
})(window);
