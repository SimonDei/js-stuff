export const DL_SCOPE_ELEMENT = Symbol('scopeElement');
export const DL_APPEND_COLLECTION = Symbol('appendCollection');
export const DL_STACK_SIZE = Symbol('stackSize');
export const DL_COLLECTION_SIZE = Symbol('collectionSize');
export const DL_COLLECTION_ELEMENTS = Symbol('collectionElements');

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

function getFirstFreeCollectionIndex() {
    let index = 1;
    while (_STATE.collections[index] !== undefined) {
        index++;
    }
    return index;
}

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

export function dlPopState() {
    if (Object.keys(_STATE.collections).length > 0) {
        throw new Error('Cannot pop state with active collections');
    }

    let state;
    if ((state = _STACK.pop()) !== undefined) {
        _STATE = state;
    }
}

export function dlGenCollection() {
    const newIndex = getFirstFreeCollectionIndex();
    _STATE.collections[newIndex] = [];
    return newIndex;
}

export function dlBindCollection(index) {
    _STATE.activeCollection = index;
}

export function dlDeleteCollection(index) {
    if (_STATE.collections[index] === undefined) {
        throw new Error('Collection does not exist');
    }

    if (_STATE.activeCollection === index) {
        throw new Error('Cannot delete active collection');
    }

    delete _STATE.collections[index];
}

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

export function dlEnable(state) {
    _STATE.state[state.description] = true;
}

export function dlDisable(state) {
    _STATE.state[state.description] = false;
}

export function dlBindScope(selector) {
    if (selector === 0 || selector == null) {
        _STATE.scopeElement = null;
        return;
    }

    _STATE.scopeElement = selector instanceof Element ? selector : document.querySelector(selector);
}

export function dlQuery(selector) {
    if (_STATE.activeCollection <= 0) {
        throw new Error('No collection is active');
    }

    _STATE.collections[_STATE.activeCollection].push(((_STATE.scopeElement && _STATE.state.scopeElement) ? _STATE.scopeElement : document).querySelector(selector));
}

export function dlQueryAll(selector) {
    if (_STATE.activeCollection <= 0) {
        throw new Error('No collection is active');
    }

    _STATE.collections[_STATE.activeCollection].push(...((_STATE.scopeElement && _STATE.state.scopeElement) ? _STATE.scopeElement : document).querySelectorAll(selector));
}

export function dlSetAttribute(attribute, value) {
    if (_STATE.activeCollection <= 0) {
        throw new Error('No collection is active');
    }

    let index = 0;
    for (const element of _STATE.collections[_STATE.activeCollection]) {
        element.setAttribute(attribute, typeof value === 'function' ? value(element, index++) : value);
    }
}

export function dlRemoveAttribute(attribute) {
    if (_STATE.activeCollection <= 0) {
        throw new Error('No collection is active');
    }

    for (const element of _STATE.collections[_STATE.activeCollection]) {
        element.removeAttribute(attribute);
    }
}

export function dlAttachEvent(event, callback) {
    if (_STATE.activeCollection <= 0) {
        throw new Error('No collection is active');
    }

    let index = 0;
    for (const element of _STATE.collections[_STATE.activeCollection]) {
        element.addEventListener(event, function() {
            callback.call(element, element, index++);
        });
    }
}
