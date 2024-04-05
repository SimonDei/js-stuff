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

StdDecls.writeClipboard = async function(message) {
  return window.clipboard.writeText(message);
};

StdDecls.readClipboard = async function() {
  return window.clipboard.readText();
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

export default StdDecls;
