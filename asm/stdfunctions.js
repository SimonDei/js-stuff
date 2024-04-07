const StdDecls = {};

// ========================================================================================
// Universal Functions
// ========================================================================================

StdDecls.mov = function(dest, source) {
  
};

StdDecls.sub = function(dest, source) {
  dest = source;
};

StdDecls.log = function(...dest) {
  console.log(...dest);
};

StdDecls.invoke = function(funcName, ...args) {
  __scope[funcName].call(__scope, ...args);
};

export default StdDecls;
