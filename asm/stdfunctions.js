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

MnemonicDecls.pop = function(target) {
  __writeRegister(target, __stack.pop());
};

MnemonicDecls.call = function(func) {
  func();
};

MnemonicDecls.jmp = function(funcName, ...args) {
  __scope[funcName].call(__scope, ...args);
};

MnemonicDecls.add = function(dest, source) {
  __writeRegister(dest, __readRegister(dest) + source);
};

MnemonicDecls.sub = function(dest, source) {
  __writeRegister(dest, __readRegister(dest) - source);
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

StdDecls.call.Log = function() {
  console.log(__stack.pop());
};

StdDecls.call.QuerySelector = function() {
  __writeRegister('r1', document.querySelector(__stack.pop()));
};

StdDecls.invoke.DumpRegisters = function() {
  console.log(`eax: ${__registers.a.e.toString('16')} ${__registers.a.h.toString('16')} ${__registers.a.l.toString('16')}`);
  console.log(`ebx: ${__registers.b.e.toString('16')} ${__registers.b.h.toString('16')} ${__registers.b.l.toString('16')}`);
  console.log(`ecx: ${__registers.c.e.toString('16')} ${__registers.c.h.toString('16')} ${__registers.c.l.toString('16')}`);
  console.log(`edx: ${__registers.d.e.toString('16')} ${__registers.d.h.toString('16')} ${__registers.d.l.toString('16')}`);
};

StdDecls.invoke.Log = function(...values) {
  console.log(...values);
};

StdDecls.invoke.QuerySelector = function(selector) {
  __writeRegister('r1', document.querySelector(selector));
};

StdDecls.invoke.AddListener = function(event, proc, ...args) {
  __readRegister('r1').addEventListener(event, __scope[proc].bind(__scope, ...args));
};

StdDecls.invoke.GetAttribute = function(name) {
  __writeRegister('r2', __readRegister('r1').getAttribute(name));
};

StdDecls.invoke.SetAttribute = function(name, value) {
  __readRegister('r1').setAttribute(name, value);
};

StdDecls.invoke.GetProperty = function(name) {
  __writeRegister('r2', __readRegister('r1')[name]);
};

StdDecls.invoke.SetProperty = function(name, value) {
  __readRegister('r1')[name] = value;
};

export { MnemonicDecls, StdDecls };
