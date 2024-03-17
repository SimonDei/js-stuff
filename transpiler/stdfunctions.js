const StdDecls = {};

StdDecls.ToInteger = function(value) {
  return Number.parseInt(value);
};

StdDecls.ToFloat = function(value) {
  return Number.parseFloat(value);
};

StdDecls.ToString = function(value) {
  return value?.toString() ?? '';
};

StdDecls.ToBoolean = function(value) {
  return Boolean(value);
};

StdDecls.I2S = function(value) {
  return value.toString();
};

StdDecls.S2I = function(value) {
  return Number.parseInt(value);
};

StdDecls.SubString = function(value, start, end) {
  return value.substring(start, end);
};

StdDecls.StringLength = function(value) {
  return value.length;
};

StdDecls.Assert = function(test, message) {
  if (!test) {
    throw new Error(message);
  }
};

StdDecls.Byte = function(value) {
  return new TextEncoder().encode(value);
};

StdDecls.Char = function(value) {
  return value.charCodeAt(0);
};

StdDecls.Find = function(needle, haystack) {
  return haystack.find(e => e === needle);
};

StdDecls.TypeOf = function(value) {
  return Object.prototype.toString.call(value);
};

StdDecls.Pairs = function(object) {
  return Object.entries(object);
};

StdDecls.Add = function(a, b) {
  return a + b;
};

StdDecls.Sub = function(a, b) {
  return a - b;
};

StdDecls.Mul = function(a, b) {
  return a * b;
};

StdDecls.Div = function(a, b) {
  return a / b;
};

StdDecls.Pow = function(a, b) {
  return Math.pow(a, b);
};

StdDecls.Print = function(message) {
  console.log(message);
};

StdDecls.Log = function(value) {
  console.log(value);
};

StdDecls.Info = function(value) {
  console.info(value)
};

StdDecls.Array = function(...values) {
  return [...values];
};

StdDecls.Length = function(value) {
  return value?.length ?? 0;
};

StdDecls.At = function(array, index) {
  return array[index];
};

StdDecls.Upper = function(value) {
  return value.toUpperCase();
};

StdDecls.Lower = function(value) {
  return value.toLowerCase();
};

StdDecls.ForEach = function(array, func) {
  for (const item of array) {
    func(item);
  }
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

StdDecls.Alert = function(message) {
  alert(message);
};

StdDecls.Confirm = function(message) {
  return confirm(message);
};

// ========================================================================================
// Ajax Functions
// ========================================================================================

StdDecls.Fetch = async function(url) {
  return fetch(url);
};

StdDecls.FetchJson = async function(url) {
  return fetch(url).then(resp => resp.json());
};

StdDecls.FetchText = async function(url) {
  return fetch(url).then(resp => resp.text());
};

// ========================================================================================
// DOM Functions
// ========================================================================================

StdDecls.QuerySelector = function(selector, context = document) {
  return context.querySelector(selector);
};

StdDecls.QuerySelectorAll = function(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
};

StdDecls.SetAttr = function(element, name, value) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  const flatElements = [element].flat();
  for (const e of flatElements) {
    e.setAttribute(name, value);
  }
};

StdDecls.GetAttr = function(element, name) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  if (Array.isArray(element)) {
    return element[0].getAttribute(name);
  }
  return element.getAttribute(name);
};

StdDecls.SetProp = function(element, name, value) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  const flatElements = [element].flat();
  for (const e of flatElements) {
    e[name] = value;
  }
};

StdDecls.GetProp = function(element, name) {
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
    e.classList.add(...classes);
  }
};

StdDecls.RemoveClass = function(element, classes) {
  if (typeof element === 'string') {
    element = Array.from(document.querySelectorAll(element));
  }
  const flatElements = [element].flat();
  for (const e of flatElements) {
    e.classList.remove(...classes);
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
