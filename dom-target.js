/**
 * @param {string} tag
 * @returns {HTMLElement}
 */
export function create_node(tag) {
  return document.createElement(tag);
}

/**
 * @param {string} text
 * @returns {Text}
 */
export function create_text_node(text) {
  return document.createTextNode(text);
}

/**
 * @param {HTMLElement} target
 * @param {string} class_name
 */
export function add_class(target, class_name) {
  target.classList.add(class_name);
}

/**
 * @param {HTMLElement} target
 * @param {string} class_name
 */
export function remove_class(target, class_name) {
  target.classList.remove(class_name);
}

/**
 * @param {HTMLElement} target
 * @param {string[]|string} classes
 */
export function set_classes_override(target, classes) {
  target.className = Array.isArray(classes) ? classes.join(' ') : classes;
}

/**
 * @param {HTMLElement} target
 * @param {string} property
 * @param {string} value
 */
export function set_style(target, property, value) {
  target.style[property] = value;
}

/**
 * @param {HTMLElement} target
 * @param {{[key: string]: string}} style_obj
 */
export function set_style_obj(target, style_obj) {
  for (const [prop, val] of Object.entries(style_obj)) {
    set_style(target, prop, val);
  }
}

/**
 * @param {HTMLElement} target
 * @param {string} key
 * @param {string} value
 */
export function set_attr(target, key, value) {
  target.setAttribute(key, value);
}

/**
 * @template {keyof GlobalEventHandlersEventMap} T
 * @param {HTMLElement} target
 * @param {T} event
 * @param {(event: GlobalEventHandlersEventMap[T]) => void} listener
 */
export function attach_listener(target, event, listener) {
  target.addEventListener(event, listener);
}

/**
 * @param {HTMLElement} target
 * @param {...HTMLElement|Text} nodes
 */
export function append_node(target, nodes) {
  if (!Array.isArray(nodes)) nodes = [nodes];
  target.append(...nodes);
}

/**
 * @param {HTMLElement} target
 * @param {string} text
 */
export function append_text(target, text) {
  append_node(target, create_text_node(text));
}

/**
 * @param {HTMLElement} target
 * @param {HTMLElement|Text|string} node_or_string
 */
export function append_node_ex(target, node_or_string) {
  if (typeof node_or_string === 'string') {
    append_text(target, node_or_string);
  } else {
    append_node(target, node_or_string);
  }
}

/**
 * @param {string} tag
 * @param {{[key: string]: string[]|string}} props
 * @param {...HTMLElement|Text|string} children
 */
export function create_node_ex(tag, props, ...children) {
  const node = create_node(tag);

  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') {
      set_classes_override(node, value);
    } else if (key === 'style') {
      set_style_obj(node, value);
    } else if (key.startsWith('on')) {
      attach_listener(node, key.slice(2).toLowerCase(), value);
    } else {
      set_attr(node, key, value);
    }
  }

  for (const child of children) {
    append_node_ex(node, child);
  }

  return node;
}

/**
 * @param {{[key: string]: string[]|string}} props
 * @param {...HTMLElement|Text|string} children
 */
export function div(props, ...children) {
  return create_node_ex('div', props, ...children);
}

/**
 * @param {EventTarget} target
 * @param {string} event_name
 * @param {{[key: string]: any}} detail
 */
export function dispatch(target, event_name, detail) {
  target.dispatchEvent(new CustomEvent(event_name, { detail }));
}
