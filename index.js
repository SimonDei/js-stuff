/**
 * @template {{[key: string]: any}} T
 * @param {T} state
 * @param {{[key: string]: ((e: any) => void)[]}} listeners
 * @returns {T}
 */
function wire( state, listeners ) {
  return new Proxy(state, {
    set(target, property, value) {
      target[property] = value;
      listeners[property]?.forEach(e => e(value));
    },
    get(target, property) {
      return target[property];
    }
  });
}

class QElement {
  /** @type {HTMLElement[]} */
  #elements;

  /**
   * @param {HTMLElement[]} elements
   */
  constructor( elements ) {
    this.#elements = elements;
  }

  /**
   * @param {(e: HTMLElement, index: number) => any} func
   */
  #apply( func ) {
    for ( let i = 0; i < this.#elements.length; i++ ) {
      func(this.#elements[i], i);
    }
  }

  /**
   * @template T
   * @param {(e: HTMLElement) => T} func
   * @returns {T}
   */
  #get( func ) {
    if ( this.#elements.length > 0 ) {
      return func(this.#elements[0]);
    }
  }

  /**
   * @param {(e: HTMLElement, index: number) => void} callback
   * @returns {QElement}
   */
  each( callback ) {
    this.#apply((e, i) => callback(e, i));
    return this;
  }

  /**
   * @returns {?QElement}
   */
  first() {
    if ( this.#elements.length > 0 ) {
      return new QElement([this.#elements[0]]);
    }
    return null;
  }

  /**
   * @returns {?QElement}
   */
  last() {
    if ( this.#elements.length > 0 ) {
      return new QElement([this.#elements[this.#elements.length - 1]]);
    }
    return null;
  }

  /**
   * @param {number} index
   * @returns {?QElement}
   */
  at( index ) {
    if ( this.#elements.length >= index ) {
      return new QElement([this.#elements[index]]);
    }
    return null;
  }

  /**
   * @returns {QElement}
   */
  empty() {
    this.#apply(e => e.innerHTML = '');
    return this;
  }

  /**
   * @param {string} [value]
   * @returns {QElement|string}
   */
  val( value ) {
    if ( !value ) {
      return this.#get(e => e.value);
    }
    this.#apply(e => e.value = value);
    return this;
  }

  /**
   * @param {string|number|boolean} [value]
   * @returns {QElement|string}
   */
  text( value ) {
    if ( !value ) {
      return this.#get(e => e.textContent);
    }
    this.#apply(e => e.textContent = value);
    return this;
  }

  /**
   * @param {string} [value]
   * @returns {QElement|string}
   */
  html( value ) {
    if ( !value ) {
      return this.#get(e => e.innerHTML);
    }
    this.#apply(e => e.innerHTML = value);
    return this;
  }

  /**
   * @param {string} name
   * @param {string} [value]
   * @returns {QElement|string}
   */
  attr( name, value ) {
    if ( !value ) {
      return this.#get(e => e.getAttribute(name));
    }
    this.#apply(e => e.setAttribute(name, value));
    return this;
  }

  /**
   * @param {string} name
   * @returns {QElement}
   */
  removeAttr( name ) {
    this.#apply(e => e.removeAttribute(name));
    return this;
  }

  /**
   * @param {string} name
   * @param {string} [value]
   * @returns {QElement|string}
   */
  data( name, value ) {
    if ( !value ) {
      return this.#get(e => e.dataset[name]);
    }
    this.#apply(e => e.dataset[name] = value);
    return this;
  }

  /**
   * @param {string|string[]} values
   * @returns {QElement}
   */
  addClass( values ) {
    if ( !Array.isArray(values) ) {
      values = [values];
    }
    this.#apply(e => e.classList.add(...values));
    return this;
  }

  /**
   * @param {string|string[]} values
   * @returns {QElement}
   */
  removeClass( values ) {
    if ( !Array.isArray(values) ) {
      values = [values];
    }
    this.#apply(e => e.classList.remove(...values));
    return this;
  }

  /**
   * @param {string[]} values
   * @returns {QElement}
   */
  toggleClass( ...values ) {
    for ( let i = 0; i < values.length; i++ ) {
      this.#get(e => e.classList.toggle(values[i]));
    }
    return this;
  }

  /**
   * @returns {QElement}
   */
  show() {
    this.#apply(e => {
      if ( e.style.display === 'none' ) {
        e.style.display = '';
      }
    });
    return this;
  }

  /**
   * @returns {QElement}
   */
  hide() {
    this.#apply(e => {
      if ( e.style.display !== 'none' ) {
        e.style.display = 'none';
      }
    });
    return this;
  }

  /**
   * @returns {QElement}
   */
  toggle() {
    this.#apply(e => {
      if ( e.style.display === 'none' ) {
        e.style.display = '';
      } else {
        e.style.display = 'none';
      }
    });
    return this;
  }

  /**
   * @param {GlobalEventHandlersEventMap} eventName
   * @param {(e: Event) => void} callback
   * @returns {QElement}
   */
  on( eventName, callback ) {
    this.#apply(e => e.addEventListener(eventName, callback));
    return this;
  }

  /**
   * @param {string} eventName
   * @returns {QElement}
   */
  off( eventName ) {
    this.#apply(e => e.removeEventListener(eventName));
    return this;
  }

  /**
   * @param {string} eventName
   * @returns {QElement}
   */
  trigger( eventName ) {
    this.#apply(e => e.dispatchEvent(new Event(eventName)));
    return this;
  }

  /**
   * @returns {QElement}
   */
  parent() {
    return new QElement([this.#get(e => e.parentElement)]);
  }

  /**
   * @param {HTMLElement|string} content
   * @returns {QElement}
   */
  prepend( content ) {
    if ( content instanceof HTMLElement ) {
      this.#apply(e => e.insertAdjacentElement('afterbegin', content));
    } else {
      this.#apply(e => e.insertAdjacentHTML('afterbegin', content));
    }
    return this;
  }

  /**
   * @param {HTMLElement|string} content
   * @returns {QElement}
   */
  append( content ) {
    if ( content instanceof HTMLElement ) {
      this.#apply(e => e.insertAdjacentElement('beforeend', content));
    } else {
      this.#apply(e => e.insertAdjacentHTML('beforeend', content));
    }
    return this;
  }

  /**
   * @param {HTMLElement|string} content
   * @returns {QElement}
   */
  before( content ) {
    if ( content instanceof HTMLElement ) {
      this.#apply(e => e.insertAdjacentElement('beforebegin', content));
    } else {
      this.#apply(e => e.insertAdjacentHTML('beforebegin', content));
    }
    return this;
  }

  /**
   * @param {HTMLElement|string} content
   * @returns {QElement}
   */
  after( content ) {
    if ( content instanceof HTMLElement ) {
      this.#apply(e => e.insertAdjacentElement('afterend', content));
    } else {
      this.#apply(e => e.insertAdjacentHTML('afterend', content));
    }
    return this;
  }

  /**
   * @param {string} tagName
   * @returns {QElement}
   */
  wrap( tagName ) {
    this.#apply(e => {
      const wrapper = document.createElement(tagName);
      e.parentElement.insertBefore(wrapper, e);
      wrapper.appendChild(e);
    });
    return this;
  }
}

/**
 * @param {string} selector
 * @returns {QElement}
 */
function _( selector ) {
  return new QElement(Array.from(document.querySelectorAll(selector)));
}
