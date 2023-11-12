(function(global) {
  const viewModelValueBindings = {};

  const viewModelScope = {};

  const viewModelProxy = new Proxy(viewModelScope, {
    get(target, property) {
      return target[property];
    },
    set(target, property, value) {
      target[property] = value;

      if (Object.hasOwn(viewModelValueBindings, property)) {
        for (const binding of viewModelValueBindings[property]) {
          binding.element[binding.binding] = value;
        }
      }

      return true;
    }
  });

  function applyViewModel( viewModelFunction ) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        loadBindings(viewModelFunction);
      });
    } else {
      loadBindings(viewModelFunction);
    }
  }

  function loadBindings( viewModelFunction ) {
    document.querySelectorAll('[ex-bind]').forEach(function(element) {
      const attribute = element.getAttribute('ex-bind');
      
      const eventBinding = attribute.split(',')[0].trim();
      const eventFunctionName = attribute.split(',').length > 1 ? attribute.split(',')[1].trim() : null;
      
      let valueBinding = attribute.split(':')[0].trim();

      if (valueBinding.includes(',')) {
        valueBinding = valueBinding.split(',')[1].trim();
      }

      const viewModelVariable = attribute.split(':').length > 1 ? attribute.split(':')[1].trim() : null;

      if (Object.hasOwn(viewModelValueBindings, viewModelVariable)) {
        viewModelValueBindings[viewModelVariable].push({
          binding: valueBinding,
          element: element
        });
      } else {
        viewModelValueBindings[viewModelVariable] = [{
          binding: valueBinding,
          element: element
        }];
      }

      if (eventBinding.length > 0) {
        if (eventFunctionName) {
          element.addEventListener(eventBinding, function(event) {
            viewModelProxy[eventFunctionName](event);
          });
        } else {
          element.addEventListener(eventBinding, function(event) {
            viewModelProxy[viewModelVariable] = event.target[valueBinding];
          });
        }
      }
    });

    viewModelFunction(viewModelProxy, viewModelScope);
  }

  global.applyViewModel = applyViewModel;
})(window);
