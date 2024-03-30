const StdDecls = {};

// ========================================================================================
// Universal Functions
// ========================================================================================

StdDecls.assert = function(test, message) {
  if (!test) {
    throw new Error(message);
  }
};

StdDecls.typeof = function(value) {
  return Object.prototype.toString.call(value);
};

StdDecls.tointeger = function(value) {
  return Number.parseInt(value);
};

StdDecls.tofloat = function(value) {
  return Number.parseFloat(value);
};

StdDecls.tostring = function(value) {
  return value?.toString() ?? '';
};

StdDecls.toboolean = function(value) {
  return Boolean(value);
};

StdDecls.I2S = function(value) {
  return value.toString();
};

StdDecls.S2I = function(value) {
  return Number.parseInt(value);
};

StdDecls.print = function(message) {
  console.log(message);
};

StdDecls.log = function(value) {
  console.log(value);
};

StdDecls.info = function(value) {
  console.info(value)
};

StdDecls.length = function(value) {
  return value?.length ?? 0;
};

StdDecls.at = function(array, index) {
  return array[index];
};

StdDecls.pairs = function(object) {
  return Object.entries(object);
};

// ========================================================================================
// String Functions
// ========================================================================================

StdDecls.upper = function(value) {
  return value.toUpperCase();
};

StdDecls.lower = function(value) {
  return value.toLowerCase();
};

StdDecls.substr = function(value, start, end) {
  return value.substring(start, end);
};

StdDecls.char = function(value) {
  return value.charCodeAt(0);
};

// ========================================================================================
// Math Functions
// ========================================================================================

StdDecls.add = function(a, b) {
  return a + b;
};

StdDecls.sub = function(a, b) {
  return a - b;
};

StdDecls.mul = function(a, b) {
  return a * b;
};

StdDecls.div = function(a, b) {
  return a / b;
};

StdDecls.pow = function(a, b) {
  return Math.pow(a, b);
};

StdDecls.floor = function(value) {
  return Math.floor(value);
};

StdDecls.round = function(value) {
  return Math.round(value);
};

StdDecls.rand = function(min = 0, max = 1) {
  return (Math.random() * max) + min;
};

StdDecls.randInt = function(min = 0, max = 1) {
  return Math.floor(Math.random() * max) + min;
};

// ========================================================================================
// Array Functions
// ========================================================================================

StdDecls.array = function(...values) {
  return [...values];
};

StdDecls.each = function(array, func) {
  for (const item of array) {
    func(item);
  }
};

StdDecls.foreach = function(array, func) {
  for (const item of array) {
    func(item);
  }
};

StdDecls.find = function(needle, haystack) {
  return haystack.find(e => e === needle);
};

StdDecls.compact = function(array) {
  return array.filter(Boolean);
};

StdDecls.concat = function(array1, array2) {
  return [...array1, ...array2];
};

// ========================================================================================
// Clipboard Functions
// ========================================================================================

StdDecls.WriteClipboard = async function(message) {
  return window.clipboard.writeText(message);
};

StdDecls.ReadClipboard = async function() {
  return window.clipboard.readText();
};

// ========================================================================================
// User Interaction Functions
// ========================================================================================

StdDecls.alert = function(message) {
  alert(message);
};

StdDecls.confirm = function(message) {
  return confirm(message);
};

// ========================================================================================
// Ajax Functions
// ========================================================================================

StdDecls.fetch = async function(url) {
  return fetch(url);
};

StdDecls.fetchJson = async function(url) {
  return fetch(url).then(resp => resp.json());
};

StdDecls.fetchText = async function(url) {
  return fetch(url).then(resp => resp.text());
};

// ========================================================================================
// DOM Functions
// ========================================================================================

StdDecls.OnReady = function(func) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', func);
  } else {
    func();
  }
};

StdDecls.QuerySelector = function(selector, context = document) {
  return context.querySelector(selector);
};

StdDecls.QuerySelectorAll = function(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
};

StdDecls.SetAttribute = function(element, name, value) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  const flatElements = [element].flat();
  for (const e of flatElements) {
    e.setAttribute(name, value);
  }
};

StdDecls.GetAttribute = function(element, name) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  if (Array.isArray(element)) {
    return element[0].getAttribute(name);
  }
  return element.getAttribute(name);
};

StdDecls.SetProperty = function(element, name, value) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  const flatElements = [element].flat();
  for (const e of flatElements) {
    e[name] = value;
  }
};

StdDecls.GetProperty = function(element, name) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  if (Array.isArray(element)) {
    return element[0][name];
  }
  return element[name];
};

StdDecls.SetHtml = function(element, html) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  const flatElements = [element].flat();
  for (const e of flatElements) {
    e.innerHTML = html;
  }
};

StdDecls.GetHtml = function(element) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  if (Array.isArray(element)) {
    return element[0].innerHTML;
  }
  return element.innerHTML;
};

StdDecls.SetText = function(element, text) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  const flatElements = [element].flat();
  for (const e of flatElements) {
    e.textContent = text;
  }
};

StdDecls.GetText = function(element) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  if (Array.isArray(element)) {
    return element[0].textContent;
  }
  return element.textContent;
};

StdDecls.SetValue = function(element, value) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  const flatElements = [element].flat();
  for (const e of flatElements) {
    e.value = value;
  }
};

StdDecls.GetValue = function(element) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  if (Array.isArray(element)) {
    return element[0].value;
  }
  return element.value;
};

StdDecls.Siblings = function(element) {
  if (typeof element === 'string') {
    element = document.querySelector(element);
  }
  return [...element.parentNode.children].filter(e => e !== element);
};

StdDecls.HasClass = function(element, classes) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  if (Array.isArray(element)) {
    return element[0].classList.contains(classes);
  }
  return element.classList.contains(classes);
};

StdDecls.AddClass = function(element, classes) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  const flatElements = [element].flat();
  for (const e of flatElements) {
    e.classList.add(...[classes].flat());
  }
};

StdDecls.RemoveClass = function(element, classes) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  const flatElements = [element].flat();
  for (const e of flatElements) {
    e.classList.remove(...[classes].flat());
  }
};

StdDecls.ToggleClass = function(element, classes) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  const flatElements = [element].flat();
  for (const e of flatElements) {
    e.classList.toggle(classes);
  }
};

StdDecls.On = function(element, eventName, callback) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  const flatElements = [element].flat();
  for (const e of flatElements) {
    e.addEventListener(eventName, callback);
  }
};

StdDecls.OnClick = function(element, callback) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  const flatElements = [element].flat();
  for (const e of flatElements) {
    e.addEventListener('click', callback);
  }
};

StdDecls.OnBlur = function(element, callback) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  const flatElements = [element].flat();
  for (const e of flatElements) {
    e.addEventListener('blur', callback);
  }
};

StdDecls.OnChange = function(element, callback) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  const flatElements = [element].flat();
  for (const e of flatElements) {
    e.addEventListener('change', callback);
  }
};

StdDecls.OnLoad = function(element, callback) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  const flatElements = [element].flat();
  for (const e of flatElements) {
    e.addEventListener('load', callback);
  }
};

StdDecls.Delegate = function(element, selector, eventName, callback) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  const flatElements = [element].flat();
  for (const e of flatElements) {
    e.addEventListener(eventName, event => {
      if (event.target.closest(selector)) {
        callback.call(event.target, event);
      }
    });
  }
};

export default StdDecls;
