const MnemonicDecls = {};
const StdDecls = {};

// ========================================================================================
// Interval Mnenomics
// ========================================================================================

MnemonicDecls.mov = function(dest, source) {
  __writeRegister(dest, source);
};

MnemonicDecls.push = function(value) {
  __stack.push(value)
};

MnemonicDecls.call = function(func) {
  func();
};

MnemonicDecls.dec = function(dest) {
  __writeRegister(dest, __readRegister(dest) - 1);
};

MnemonicDecls.sub = function(dest, source) {
  dest = source;
};

MnemonicDecls.invoke = function(funcName, ...args) {
  __scope[funcName].call(__scope, ...args);
};

// ========================================================================================
// Standard Functions
// ========================================================================================

StdDecls.log = function() {
  console.log(__stack.pop());
};

export { MnemonicDecls, StdDecls };
