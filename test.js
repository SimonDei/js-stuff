//
// dlEnable/dlDisable Flags
//
export const DL_SCOPE_ELEMENT = 0xF000;
export const DL_APPEND_BUFFER = 0xF001;

//
// dlGet States
//
export const DL_STACK_SIZE = 0xE000;
export const DL_BUFFER_SIZE = 0xE001;
export const DL_BUFFER_ELEMENTS = 0xE002;

const _STACK = [];

let _STATE = {
    state: {
        scopeElement: false,
        appendCollection: false
    },
    scopeElement: null,
    activeCollection: 0,
    collections: {}
};

function _getFirstFreeCollectionIndex() {
    let index = 1;
    while (_STATE.collections[index] !== undefined) {
        index++;
    }
    return index;
}

function _querySingleElement(selector) {
    if (_STATE.activeCollection <= 0) {
        throw new Error('No collection is active');
    }

    if (_STATE.state.appendCollection) {
        _STATE.collections[_STATE.activeCollection].push(((_STATE.scopeElement && _STATE.state.scopeElement) ? _STATE.scopeElement : document).querySelector(selector));
    } else {
        _STATE.collections[_STATE.activeCollection] = [((_STATE.scopeElement && _STATE.state.scopeElement) ? _STATE.scopeElement : document).querySelector(selector)];
    }
}

function _queryMultipleElements(selector) {
    if (_STATE.activeCollection <= 0) {
        throw new Error('No collection is active');
    }

    if (_STATE.state.appendCollection) {
        _STATE.collections[_STATE.activeCollection].push(...((_STATE.scopeElement && _STATE.state.scopeElement) ? _STATE.scopeElement : document).querySelectorAll(selector));
    } else {
        _STATE.collections[_STATE.activeCollection] = ((_STATE.scopeElement && _STATE.state.scopeElement) ? _STATE.scopeElement : document).querySelectorAll(selector);
    }
}

/**
 * @throws {Error}
 */
function _checkForActiveCollection() {
    if (_STATE.activeCollection <= 0) {
        throw new Error('No collection is active');
    }
}

/**
 * @returns {void}
 */
export function dlPushState() {
    _STACK.push(_STATE);
    _STATE = {
        state: {
            scopeElement: false,
            appendCollection: false
        },
        scopeElement: null,
        activeCollection: 0,
        collections: {}
    };
}

/**
 * @returns {void}
 */
export function dlPopState() {
    if (Object.keys(_STATE.collections).length > 0) {
        throw new Error('Cannot pop state with active collections');
    }

    let state;
    if ((state = _STACK.pop()) !== undefined) {
        _STATE = state;
    }
}

/**
 * @returns {number}
 */
export function dlGenBuffer() {
    const newIndex = _getFirstFreeCollectionIndex();
    _STATE.collections[newIndex] = [];
    return newIndex;
}

/**
 * @param {number} index
 * @returns {void}
 */
export function dlBindBuffer(index) {
    _STATE.activeCollection = index;
}

/**
 * @param {number} index
 * @returns {void}
 */
export function dlDeleteBuffer(index) {
    if (_STATE.collections[index] === undefined) {
        throw new Error('Collection does not exist');
    }

    if (_STATE.activeCollection === index) {
        throw new Error('Cannot delete active collection');
    }

    delete _STATE.collections[index];
}

/**
 * @param {number} state
 * @returns {any}
 */
export function dlGet(state) {
    if (state === DL_STACK_SIZE) {
        return _STACK.length;
    }

    if (state === DL_COLLECTION_SIZE) {
        return _STATE.collections[_STATE.activeCollection].length;
    }

    if (state === DL_COLLECTION_ELEMENTS) {
        return _STATE.collections[_STATE.activeCollection];
    }

    if (state === DL_SCOPE_ELEMENT) {
        return _STATE.scopeElement;
    }

    throw new Error('Invalid state requested');
}

/**
 * @param {number} state
 * @returns {void}
 */
export function dlEnable(state) {
    if (state > 0xFFFF || state < 0xF000) {
        throw new Error('Invalid state parameter');
    }

    _STATE.state[state.description] = true;
}

/**
 * @param {number} state
 * @returns {void}
 */
export function dlDisable(state) {
    if (state > 0xFFFF || state < 0xF000) {
        throw new Error('Invalid state parameter');
    }

    _STATE.state[state.description] = false;
}

/**
 * @param {string|0} selector
 * @returns {void}
 */
export function dlBindScope(selector) {
    if (selector === 0 || selector == null) {
        _STATE.scopeElement = null;
        return;
    }

    _STATE.scopeElement = document.querySelector(selector);
}

/**
 * @param {string} selector
 * @returns {void}
 */
export function dlQuery(selector) {
    _checkForActiveCollection();

    _querySingleElement(selector);
}

/**
 * @param {string} selector
 * @returns {void}
 */
export function dlQueryAll(selector) {
    _checkForActiveCollection();

    _queryMultipleElements(selector);
}

/**
 * @param {string} attribute
 * @returns {number}
 */
export function dlGetAttributei(attribute) {
    _checkForActiveCollection();

    return Number.parseInt(_STATE.collections[_STATE.activeCollection][0]?.getAttribute(attribute));
}

/**
 * @param {string} attribute
 * @returns {number}
 */
export function dlGetAttributef(attribute) {
    _checkForActiveCollection();

    return Number.parseFloat(_STATE.collections[_STATE.activeCollection][0]?.getAttribute(attribute));
}

/**
 * @param {string} attribute
 * @returns {number}
 */
export function dlGetAttributeb(attribute) {
    _checkForActiveCollection();

    return Boolean(_STATE.collections[_STATE.activeCollection][0]?.getAttribute(attribute));
}

/**
 * @param {string} attribute
 * @param {((elment: HTMLElement, index: number) => number)|number} value
 * @returns {void}
 */
export function dlSetAttributei(attribute, value) {
    _checkForActiveCollection();

    let index = 0;
    for (const element of _STATE.collections[_STATE.activeCollection]) {
        element.setAttribute(attribute, typeof value === 'function' ? value(element, index++).toString() : value.toString());
    }
}

/**
 * @param {string} attribute
 * @param {((elment: HTMLElement, index: number) => number)|number} value
 * @returns {void}
 */
export function dlSetAttributef(attribute, value) {
    _checkForActiveCollection();

    let index = 0;
    for (const element of _STATE.collections[_STATE.activeCollection]) {
        element.setAttribute(attribute, typeof value === 'function' ? value(element, index++).toString() : value.toString());
    }
}

/**
 * @param {string} attribute
 * @param {((elment: HTMLElement, index: number) => boolean)|boolean} value
 * @returns {void}
 */
export function dlSetAttributeb(attribute, value) {
    _checkForActiveCollection();

    let index = 0;
    for (const element of _STATE.collections[_STATE.activeCollection]) {
        element.setAttribute(attribute, typeof value === 'function' ? value(element, index++).toString() : value.toString());
    }
}

/**
 * @param {string} name
 * @param {((elment: HTMLElement, index: number) => number)|number} value
 * @returns {void}
 */
export function dlSetDatai(name, value) {
    _checkForActiveCollection();

    let index = 0;
    for (const element of _STATE.collections[_STATE.activeCollection]) {
        element.dataset[name] = typeof value === 'function' ? value(element, index++).toString() : value.toString();
    }
}

/**
 * @param {string} name
 * @param {((elment: HTMLElement, index: number) => number)|number} value
 * @returns {void}
 */
export function dlSetDataf(name, value) {
    _checkForActiveCollection();

    let index = 0;
    for (const element of _STATE.collections[_STATE.activeCollection]) {
        element.dataset[name] = typeof value === 'function' ? value(element, index++).toString() : value.toString();
    }
}

/**
 * @param {string} name
 * @param {((elment: HTMLElement, index: number) => boolean)|boolean} value
 * @returns {void}
 */
export function dlSetDatab(name, value) {
    _checkForActiveCollection();

    let index = 0;
    for (const element of _STATE.collections[_STATE.activeCollection]) {
        element.dataset[name] = typeof value === 'function' ? value(element, index++).toString() : value.toString();
    }
}

/**
 * @param {(element: HTMLElement, index: number) => HTMLElement} predicate
 * @returns {void}
 */
export function dlMapFunc(predicate) {
    _checkForActiveCollection();

    let index = 0;
    for (const element of _STATE.collections[_STATE.activeCollection]) {
        predicate.call(element, element, index);
    }
}

/**
 * @param {string} attribute
 * @returns {void}
 */
export function dlRemoveAttribute(attribute) {
    _checkForActiveCollection();

    for (const element of _STATE.collections[_STATE.activeCollection]) {
        element.removeAttribute(attribute);
    }
}

/**
 * @param {string} event
 * @param {(element: HTMLElement, index: number) => void} callback
 * @returns {void}
 */
export function dlAttachEvent(event, callback) {
    _checkForActiveCollection();

    let index = 0;
    for (const element of _STATE.collections[_STATE.activeCollection]) {
        element.addEventListener(event, function() {
            callback.call(element, element, index++);
        });
    }
}
