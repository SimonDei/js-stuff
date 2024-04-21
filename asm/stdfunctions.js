const MnemonicDecls = {};
const StdDecls = { call: {}, invoke: {} };

// ========================================================================================
// Interval Mnenomics
// ========================================================================================

MnemonicDecls.mov = function(dest, source) {
  __writeRegister(dest, source);
};

MnemonicDecls.push = function(value) {
  __stack.push(value);
};

MnemonicDecls.call = function(func) {
  func();
};

MnemonicDecls.jmp = function(funcName, ...args) {
  __scope[funcName].call(__scope, ...args);
};

MnemonicDecls.sub = function(dest, source) {
  dest = source;
};

MnemonicDecls.invoke = function(funcName, ...args) {
  typeof funcName === 'string'
    ? __scope[funcName].call(__scope, ...args)
    : funcName.call(this, ...args);
};

MnemonicDecls.sizestr = function(value) {
  return value.length;
};

MnemonicDecls.substr = function(start, end) {
  return value.substring(start, end);
};

MnemonicDecls.catstr = function(str1, str2) {
  return str1 + str2;
};

MnemonicDecls.echo = function(value) {
  console.log(value);
};

// ========================================================================================
// Standard Functions
// ========================================================================================

StdDecls.call.log = function() {
  console.log(__stack.pop());
};

StdDecls.call.querySelector = function() {
  __writeRegister('r1', document.querySelector(__stack.pop()));
};

StdDecls.invoke.log = function(...values) {
  console.log(...values);
};

StdDecls.invoke.QuerySelector = function(selector) {
  __writeRegister('r1', document.querySelector(selector));
};

StdDecls.invoke.SetAttribute = function(name, value) {
  __readRegister('r1').setAttribute(name, value);
};

StdDecls.invoke.SetProperty = function(name, value) {
  __readRegister('r1')[name] = value;
};

export { MnemonicDecls, StdDecls };
