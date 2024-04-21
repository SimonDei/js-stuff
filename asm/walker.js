import { MnemonicDecls, StdDecls } from './stdfunctions.js';

export default class Walker {
  static #CallFunctions = Object.keys(StdDecls.call);
  static #InvokeFunctions = Object.keys(StdDecls.invoke);

  static #NATIVE_TYPES = {
    'nothing': 'void',
    'real': 'number',
    'integer': 'number',
    'string': 'string',
    'boolean': 'boolean',
    'element': 'HTMLElement'
  };

  static #NATIVE_OPERATORS = {
    '.': '.',
    '->': '.',
    '==': '===',
    '!=': '!==',
    'is': '===',
    'not': '!==',
    'and': '&&',
    'or': '||',
    'less': '<',
    'greater': '>'
  };

  #ast = [];
  #prevTargetExpr = {};
  #nextTargetExpr = {};
  #parentTargetExpr = [];
  #targetExpr = [];
  #stack = [];
  #definedVariableNames = [];
  #typesEnabled = false;
  #depth = 1;
  #separator = '';
  #allowSpaces = true;
  #allowSemi = true;
  #walkIndex = 0;
  #walkLength = 0;
  #foundMnemonicFunctions = [];
  #foundStdCallFunctions = [];
  #foundStdInvokeFunctions = [];
  #nestedCallStack = 0;
  #isInObject = false;
  #isInMemberExpression = false;
  #isInAssignmentExpression = false;
  #source = '';

  constructor(ast, types = false) {
    this.#ast = ast;
    this.#targetExpr = this.#ast;
    this.#typesEnabled = types;
  }

  #addSpaces() {
    if (!this.#allowSpaces) {
      return;
    }

    for (let i = 0; i < this.#depth; i++) {
      this.#source += '  ';
    }
  }

  #addJsDocType(declType) {
    let typeValue = ''

    if (Object.keys(Walker.#NATIVE_TYPES).includes(declType)) {
      typeValue = Walker.#NATIVE_TYPES[declType];
    } else {
      typeValue = declType;
    }

    return `/** @type {${typeValue}} */`;
  }

  #addJsDocReturnType(returnType) {
    let typeValue = ''

    if (Object.keys(Walker.#NATIVE_TYPES).includes(returnType)) {
      typeValue = Walker.#NATIVE_TYPES[returnType];
    } else {
      typeValue = returnType;
    }

    return `/** @returns {${typeValue}} */`;
  }

  globalsDeclaration() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    const prevTargetExpr = this.#targetExpr;
    this.#targetExpr = this.#targetExpr.body;

    this.walk();

    this.#targetExpr = prevTargetExpr;

    this.#source += '\n';
  }

  functionDeclaration() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    // this.#source += `${this.#addJsDocReturnType(this.#targetExpr.returns)} `;

    if (this.#targetExpr.async) {
      this.#source += 'async ';
    }

    this.#source += 'function';
    
    if (this.#targetExpr.name) {
      this.#source += ` ${this.#targetExpr.name}`;
    }

    this.#source += '(';

    this.#targetExpr.parameters
      // .filter(e => e.value !== 'nothing')
      .forEach((e, i, arr) => {
        if (i < arr.length - 1) {
          this.#source += `${e}, `; // `${this.#addJsDocType(e.type)} ${e.value}, `;
          return;
        }

        this.#source += e; // `${this.#addJsDocType(e.type)} ${e.value}`;
      });

    this.#source += ') {\n';

    const prevTargetExpr = this.#targetExpr;
    this.#targetExpr = this.#targetExpr.body;

    this.#depth++;

    const allowSpacesProp = this.#allowSpaces;
    const prevAllowSemi = this.#allowSemi;
    const prevCallStack = this.#nestedCallStack;

    this.#allowSpaces = true;
    this.#allowSemi = true;
    this.#nestedCallStack = 0;

    this.walk();

    this.#allowSpaces = allowSpacesProp;
    this.#allowSemi = prevAllowSemi;
    this.#nestedCallStack = prevCallStack;

    this.#depth--;

    this.#targetExpr = prevTargetExpr;

    this.#addSpaces();

    this.#source += `}${this.#nestedCallStack > 0 ? '' : '\n'}`;
  }

  variableDeclaration() {
    this.#addSpaces();

    this.#source += `${this.#addJsDocType(this.#targetExpr.varType)} __vars.${this.#targetExpr.name} = `;
    this.#definedVariableNames.push(this.#targetExpr.name);

    const prevTargetExpr = this.#targetExpr;
    this.#targetExpr = this.#targetExpr.body;

    this.#separator = ' ';
    this.#allowSpaces = false;
    this.#allowSemi = false;
    this.#stack.push('VAR');

    this.walk();

    this.#stack.pop();
    this.#separator = '';
    this.#allowSpaces = true;
    this.#allowSemi = true;

    this.#targetExpr = prevTargetExpr;

    this.#source += ';\n';
  }

  constantDeclaration() {
    this.#addSpaces();

    this.#source += `const ${this.#targetExpr.name} = `; // `const ${this.#addJsDocType(this.#targetExpr.varType)} ${this.#targetExpr.name} = `;

    const prevTargetExpr = this.#targetExpr;
    this.#targetExpr = this.#targetExpr.body;

    this.#separator = ' ';
    this.#allowSpaces = false;
    this.#allowSemi = false;

    this.walk();

    this.#separator = '';
    this.#allowSpaces = true;
    this.#allowSemi = true;

    this.#targetExpr = prevTargetExpr;

    this.#source += ';\n';
  }

  ifStatement() {
    this.#addSpaces();

    this.#source += 'if (';

    let prevTargetExpr = this.#targetExpr;
    this.#targetExpr = this.#targetExpr.testLeft;

    let prevSpaces = this.#allowSpaces;
    let prevSemi = this.#allowSemi;

    this.#allowSpaces = false;
    this.#allowSemi = false;

    this.walk();

    this.#allowSpaces = prevSpaces;
    this.#allowSemi = prevSemi;

    this.#targetExpr = prevTargetExpr;

    this.#source += ` ${this.#targetExpr.operator} `;

    prevTargetExpr = this.#targetExpr;
    this.#targetExpr = this.#targetExpr.testRight;

    prevSpaces = this.#allowSpaces;
    prevSemi = this.#allowSemi;

    this.#allowSpaces = false;
    this.#allowSemi = false;

    this.walk();

    this.#allowSpaces = prevSpaces;
    this.#allowSemi = prevSemi;

    this.#targetExpr = prevTargetExpr;

    this.#source += ') {\n';

    this.#targetExpr = this.#targetExpr.then;

    this.#depth++;

    this.walk();

    this.#depth--;

    this.#targetExpr = prevTargetExpr;

    if (this.#targetExpr.else) {
      this.#addSpaces();

      this.#source += '} else {\n';

      prevTargetExpr = this.#targetExpr;
      this.#targetExpr = this.#targetExpr.else;

      this.#depth++;

      this.walk();

      this.#depth--;

      this.#targetExpr = prevTargetExpr;
    }

    this.#addSpaces();

    this.#source += '}\n';
  }

  setExpression() {
    this.#addSpaces();

    /*
    this.#source += `${this.#targetExpr.name} = `;
    */

    let prevTargetExpr = this.#targetExpr;
    this.#targetExpr = this.#targetExpr.left;

    this.#allowSpaces = false;
    this.#allowSemi = false;

    this.walk();

    this.#allowSpaces = true;
    this.#allowSemi = true;

    this.#targetExpr = prevTargetExpr;

    this.#source += ' = ';

    prevTargetExpr = this.#targetExpr;
    this.#targetExpr = this.#targetExpr.right;

    this.#separator = ' ';
    this.#allowSpaces = false;
    this.#allowSemi = false;

    this.walk();

    this.#separator = '';
    this.#allowSpaces = true;
    this.#allowSemi = true;

    this.#targetExpr = prevTargetExpr;

    this.#source += ';\n';
  }

  memberExpression() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    this.#source += `${this.#targetExpr.left}.`;
    
    const prevAllowSpaces = this.#allowSpaces;
    const prevAllowSemi = this.#allowSemi;
    const prevTargetExpr = this.#targetExpr;
    const prevIsInMemberExpr = this.#isInMemberExpression;

    this.#targetExpr = this.#targetExpr.right;
    this.#allowSemi = false;
    this.#allowSpaces = false;
    this.#isInMemberExpression = true;

    this.walk();

    this.#allowSpaces = prevAllowSpaces;
    this.#allowSemi = prevAllowSemi;
    this.#targetExpr = prevTargetExpr;
    this.#isInMemberExpression = prevIsInMemberExpr;

    if (this.#allowSemi) {
      this.#source += ';\n';
    }
  }

  arrayAccessExpression() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    this.#source += `${this.#targetExpr.name}[`;

    const prevAllowSpaces = this.#allowSpaces;
    const prevAllowSemi = this.#allowSemi;
    const prevTargetExpr = this.#targetExpr;

    this.#targetExpr = this.#targetExpr.body;
    this.#allowSemi = false;
    this.#allowSpaces = false;

    this.walk();

    this.#allowSpaces = prevAllowSpaces;
    this.#allowSemi = prevAllowSemi;
    this.#targetExpr = prevTargetExpr;

    this.#source += ']';

    if (this.#allowSemi) {
      this.#source += ';\n';
    }
  }

  conditionExpression() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    this.#source += `if (!(`;

    const prevAllowSpaces = this.#allowSpaces;
    const prevAllowSemi = this.#allowSemi;
    const prevTargetExpr = this.#targetExpr;

    this.#targetExpr = this.#targetExpr.body;
    this.#allowSemi = false;
    this.#allowSpaces = false;

    this.walk();

    this.#allowSpaces = prevAllowSpaces;
    this.#allowSemi = prevAllowSemi;
    this.#targetExpr = prevTargetExpr;

    this.#source += ')) {\n';

    this.#depth++;
    this.#addSpaces();
    this.#depth--;

    this.#source += 'return;\n';
    
    this.#addSpaces();

    this.#source += '}\n';
  }

  staticValue() {
    this.#source += this.#targetExpr.name;

    if (this.#separator && this.#walkIndex < this.#walkLength - 1) {
      this.#source += this.#separator;
    }
  }

  functionReference() {
    this.#source += `${this.#targetExpr.name}`;

    if (this.#separator && this.#walkIndex < this.#walkLength - 1) {
      this.#source += this.#separator;
    }
  }

  loopStatement() {
    this.#addSpaces();

    this.#source += 'while (!(';

    let prevTargetExpr = this.#targetExpr;
    this.#targetExpr = this.#targetExpr.exitwhen.body;

    const prevAllowSpaces = this.#allowSpaces;
    const prevAllowSemi = this.#allowSemi;

    this.#allowSpaces = false;
    this.#allowSemi = false;

    this.walk();

    this.#allowSpaces = prevAllowSpaces;
    this.#allowSemi = prevAllowSemi;

    this.#targetExpr = prevTargetExpr;

    this.#source += ')) {\n';

    prevTargetExpr = this.#targetExpr
    this.#targetExpr = this.#targetExpr.body;

    this.#depth++;

    this.walk();

    this.#depth--;

    this.#targetExpr = prevTargetExpr;

    this.#addSpaces();

    this.#source += '}\n';
  }

  forStatement() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    this.#source += `for (`;

    let prevTargetExpr = null;
    let prevAllowSpaces = null;
    let prevAllowSemi = null;

    if (this.#targetExpr.from.length > 0) {
      this.#source += `let ${this.#targetExpr.indexVar} = `;

      prevTargetExpr = this.#targetExpr;
      this.#targetExpr = this.#targetExpr.from;

      prevAllowSpaces = this.#allowSpaces;
      prevAllowSemi = this.#allowSemi;

      this.#allowSpaces = false;
      this.#allowSemi = false;

      this.walk();

      this.#allowSpaces = prevAllowSpaces;
      this.#allowSemi = prevAllowSemi;

      this.#targetExpr = prevTargetExpr;
    }

    this.#source += `; ${this.#targetExpr.indexVar} <= `;

    prevTargetExpr = this.#targetExpr;
    this.#targetExpr = this.#targetExpr.to;

    prevAllowSpaces = this.#allowSpaces;
    prevAllowSemi = this.#allowSemi;

    this.#allowSpaces = false;
    this.#allowSemi = false;

    this.walk();

    this.#allowSpaces = prevAllowSpaces;
    this.#allowSemi = prevAllowSemi;

    this.#targetExpr = prevTargetExpr;

    this.#source += `; ${this.#targetExpr.indexVar}++) {\n`;

    prevTargetExpr = this.#targetExpr;
    this.#targetExpr = this.#targetExpr.body;

    this.#depth++;

    this.walk();

    this.#depth--;

    this.#targetExpr = prevTargetExpr;

    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    this.#source += '}\n';
  }

  doExpression() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    this.#source += '(';

    if (this.#targetExpr.async) {
      this.#source += 'async ';
    }

    this.#source += 'function() {\n';

    const prevTargetExpr = this.#targetExpr;
    this.#targetExpr = this.#targetExpr.body;

    this.#depth++;

    this.walk();

    this.#depth--;

    this.#targetExpr = prevTargetExpr;

    this.#addSpaces();

    this.#source += `})()`;
  }

  returnExpression() {
    this.#addSpaces();

    this.#source += 'return ';

    const prevTargetExpr = this.#targetExpr;
    const prevAllowSpaces = this.#allowSpaces;
    const prevAllowSemi = this.#allowSemi;

    this.#targetExpr = this.#targetExpr.body;
    
    this.#allowSpaces = false
    this.#allowSemi = false;
    
    this.walk();

    this.#targetExpr = prevTargetExpr;
    this.#allowSpaces = prevAllowSpaces;
    this.#allowSemi = prevAllowSemi;

    this.#source += ';\n';
  }

  nilExpression() {
    if (['is', 'not', '===', '!=='].includes(this.#prevTargetExpr.value)) {
      this.#source = this.#source.slice(0, -2);
    }

    this.#source += ' null';
  }

  structDefinition() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    this.#source += `const ${this.#targetExpr.name} = {\n`;

    const prevTargetExpr = this.#targetExpr;
    const prevAllowSpaces = this.#allowSpaces;
    const prevAllowSemi = this.#allowSemi;

    this.#targetExpr = this.#targetExpr.body;
    this.#allowSpaces = true;
    this.#allowSemi = false;

    this.#depth++;

    this.walk();

    this.#depth--;

    this.#targetExpr = prevTargetExpr;
    this.#allowSpaces = prevAllowSpaces;
    this.#allowSemi = prevAllowSemi;

    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    this.#source += '};\n';
  }

  assignmentExpression() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    if (this.#isInObject) {
      this.objectAssignmentExpression();
      return;
    }

    this.#source += `${this.#targetExpr.left} = `;

    const prevTargetExpr = this.#targetExpr;
    const prevIsInAssignmentExpr = this.#isInAssignmentExpression;

    this.#targetExpr = this.#targetExpr.right;
    this.#isInAssignmentExpression = true;

    this.walk();

    this.#targetExpr = prevTargetExpr;
    this.#isInAssignmentExpression = prevIsInAssignmentExpr;

    if (!this.#isInMemberExpression) {
      this.#source += ';\n';
    }
  }

  objectAssignmentExpression() {
    this.#source += `${this.#targetExpr.left}: `;

    const prevTargetExpr = this.#targetExpr;
    const prevIsInAssignmentExpr = this.#isInAssignmentExpression;

    this.#targetExpr = this.#targetExpr.right;
    this.#isInAssignmentExpression = true;

    this.walk();

    this.#targetExpr = prevTargetExpr;
    this.#isInAssignmentExpression = prevIsInAssignmentExpr;

    //if (this.#walkIndex <= this.#walkLength) {
      this.#source += ',\n';
    //}
  }

  objectDeclaration() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    this.#source += `{`;

    const prevTargetExpr = this.#targetExpr;
    const prevIsInObject = this.#isInObject;
    //const prevAllowSpaces = this.#allowSpaces;

    this.#targetExpr = this.#targetExpr.body;
    this.#isInObject = true;
    //this.#allowSpaces = true;
    this.#depth++;

    this.walk();

    this.#targetExpr = prevTargetExpr;
    this.#isInObject = prevIsInObject;
    //this.#allowSpaces = prevAllowSpaces;
    this.#depth--;

    /*
    if (this.#targetExpr.body.length > 0) {
      this.#depth++;
      
      this.#source += '\n';
      this.#addSpaces();
    }

    for (let i = 0; i < this.#targetExpr.body.length; i += 4) {
      this.#source += `${this.#targetExpr.body[i].value}: ${this.#targetExpr.body[i + 2].value}`;

      if (i + 4 <= this.#targetExpr.body.length) {
        this.#source += ',\n';
        this.#addSpaces();
      }
    }

    if (this.#targetExpr.body.length > 0) {
      this.#depth--;

      this.#source += '\n';
      this.#addSpaces();
    }
    */

    this.#source += '}';
  }

  number() {
    this.#source += this.#targetExpr.value;

    if (this.#nestedCallStack <= 0 && this.#separator && this.#walkIndex < this.#walkLength - 1) {
      this.#source += ' ';
    }
  }

  string() {
    this.#source += this.#targetExpr.value;

    if (this.#walkIndex < this.#walkLength - 1) {
      this.#source += ' ';
    }
  }

  identifier() {
    if (this.#targetExpr.value.startsWith('#')) {
      this.#source += `${this.#targetExpr.value.slice(1)}.length`;

      if (this.#walkIndex < this.#walkLength - 1 && this.#nextTargetExpr?.value !== '.' && this.#allowSpaces) {
        this.#source += ' ';
      }

      return;
    }
    
    if (this.registers.includes(this.#targetExpr.value.toLowerCase())) {
      this.#targetExpr.value = `__readRegister('${this.#targetExpr.value.toLowerCase()}')`;
    }

    if (this.#definedVariableNames.includes(this.#targetExpr.value)) {
      this.#targetExpr.value = `__vars.${this.#targetExpr.value}`;
    }

    this.#source += this.#targetExpr.value;

    if (this.#walkIndex < this.#walkLength - 1 && this.#nextTargetExpr?.value !== '.' && this.#nextTargetExpr?.value !== '->' && this.#allowSpaces) {
      this.#source += ' ';
    }
  }

  operator() {
    if (this.#isInMemberExpression && this.#isInAssignmentExpression && this.#targetExpr.value === ',') {
      return;
    }

    if (this.#targetExpr.value === '?' && this.#stack.at(-1) === 'VAR') {
      this.#source += 'null';
      return;
    }

    if (Object.keys(Walker.#NATIVE_OPERATORS).includes(this.#targetExpr.value)) {
      this.#source += Walker.#NATIVE_OPERATORS[this.#targetExpr.value];
    } else {
      this.#source += this.#targetExpr.value;
    }

    /*
    if (this.#targetExpr.value === '->') {
      this.#source += '.';
      return;
    }

    this.#source += this.#targetExpr.value;
    */

    if ((this.#walkIndex < this.#walkLength - 1 && this.#allowSpaces) || this.#nestedCallStack > 0) {
      this.#source += ' ';
    }
  }

  comment() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    this.#source += `// ${this.#targetExpr.body.map(e => e.value ?? '').join(' ')}\n`;
  }

  debugExpression() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    this.#source += 'debugger;\n';
  }

  registers = [
    'eax', 'ebx', 'ecx', 'edx',
    'ax', 'bx', 'cx', 'dx',
    'ah', 'bh', 'ch', 'dh',
    'al', 'bl', 'cl', 'dl',
    'r1', 'r2', 'r3', 'r4'
  ];

  switchTargetExpr(newTargetExpr) {
    const prevTargetExpr = this.#targetExpr;
    this.#targetExpr = newTargetExpr;
    return prevTargetExpr;
  }

  replaceWithStringNode(index) {
    if (this.#targetExpr.body[index].type !== 'String') {
      this.#targetExpr.body[index] = {
        type: 'String',
        value: `'${this.#targetExpr.body[index].value}'`
      };
    }
  }

  replaceWithStringNodeIfRegister(index) {
    if (this.#targetExpr.body[index].type !== 'String'
      && this.registers.includes(this.#targetExpr.body[index].value?.toLowerCase())) {
      this.#targetExpr.body[index] = {
        type: 'String',
        value: `'${this.#targetExpr.body[index].value}'`
      };
    }
  }

  checkParametersForStdFunction(callType) {
    if (callType === 'call') {
      if (Walker.#CallFunctions.includes(this.#targetExpr.body[0]?.value)) {
        this.#foundStdCallFunctions.push(this.#targetExpr.body[0]?.value);
        this.#targetExpr.body[0].value = `__std.call.${this.#targetExpr.body[0]?.value}`;
        return true;
      }
    } else {
      if (Walker.#InvokeFunctions.includes(this.#targetExpr.body[0]?.value)) {
        this.#foundStdInvokeFunctions.push(this.#targetExpr.body[0]?.value);
        this.#targetExpr.body[0].value = `__std.invoke.${this.#targetExpr.body[0]?.value}`;
        return true;
      }
    }
    return false;
  }

  checkParametersForRegisters(startIndex, endIndex) {
    if (!startIndex) {
      startIndex = 0;
    }

    if (!endIndex) {
      endIndex = this.#targetExpr.body.length;
    }

    for (let i = startIndex; i < endIndex; i++) {
      if (this.#targetExpr.body[i].type === 'Identifier'
        && this.registers.includes(this.#targetExpr.body[i].value?.toLowerCase())
      ) {
        this.#targetExpr.body[i].value = `__readRegister('${this.#targetExpr.body[i].value.toLowerCase()}')`;
      }
    }
  }
  
  checkVarTypeAndValue(type, value) {
    switch (type) {
      case 'byte':
        return (typeof value === 'number' && value < Math.pow(2, 8)) || typeof value === 'string';

      case 'word':
        return (typeof value === 'number' && value < Math.pow(2, 16)) || typeof value === 'string';
        
      case 'dword':
        return (typeof value === 'number' && value < Math.pow(2, 32)) || typeof value === 'string';
  
      case 'real4':
        return typeof value === 'number' && value === Math.fround(value);

      case 'real8':
        return typeof value === 'number' && value === Number.parseFloat(value);
    }

    return false;
  }

  // =================================================================================
  // =================================================================================
  // =================================================================================

  setup() {
    let start = `(function() {
  const __scope = {};
  const __stack = [];
  const __vars = {};
  const __registers = {
    a: { e: 0xffff, h: 0xff, l: 0xff },
    b: { e: 0xffff, h: 0xff, l: 0xff },
    c: { e: 0xffff, h: 0xff, l: 0xff },
    d: { e: 0xffff, h: 0xff, l: 0xff },
    r: { '1': 0, '2': 0, '3': 0, '4': 0 }
  };
  function __topLevelRegister(name) {
    name = name.toLowerCase();
    if (name.length === 2) {
      return name.split('')[0];
    }
    return name.split('')[1];
  }
  function __readRegister(name) {
    name = name.toLowerCase();
    const targetRegister = __registers[__topLevelRegister(name)];
    if (name.length === 2) {
      if (/[\\dhl]$/i.test(name)) {
        return targetRegister[name.split('')[1]];
      }
      return ((targetRegister.h << 8) | targetRegister.l) >>> 0;
    }
    if (name.startsWith('e')) {
      return ((targetRegister.e << 16) | (targetRegister.h << 8) | targetRegister.l) >>> 0;
    }
  }
  function __writeRegister(name, value) {
    name = name.toLowerCase();
    const targetRegister = __registers[__topLevelRegister(name)];
    if (name.length === 2) {
      if (/^r/i.test(name)) {
        targetRegister[name.split('')[1]] = value;
      }
      if (name.endsWith('h') || name.endsWith('l')) {
        targetRegister[name.split('')[1]] = value & 0xff;
        return;
      }
      targetRegister.h = (value >> 8) & 0xff;
      targetRegister.l = value & 0xff;
      return;
    }
    if (name.startsWith('e')) {
      targetRegister.e = (value >> 16) & 0xffff;
      targetRegister.h = (value >> 8) & 0xff;
      targetRegister.l = value & 0xff;
    }
  }
`;

    return start;
  }

  dataSection() {
    this.#addSpaces();

    this.#source += '// ====== Data Section ======\n';

    const prevTargetExpr = this.switchTargetExpr(this.#targetExpr.body);

    this.walk();

    this.#targetExpr = prevTargetExpr;
  }

  codeSection() {
    this.#addSpaces();

    this.#source += '// ====== Code Section ======\n';

    const prevTargetExpr = this.switchTargetExpr(this.#targetExpr.body);

    this.walk();

    this.#targetExpr = prevTargetExpr;
  }

  procedureDefinition() {
    this.#addSpaces();

    console.log('Found procedure definition');

    this.#source += `__scope.${this.#targetExpr.name} = function(`;

    for (let i = 0; i < this.#targetExpr.parameters.length; i++) {
      this.#source += `${this.#addJsDocType(this.#targetExpr.parameters[i].type)} ${this.#targetExpr.parameters[i].name}`;

      if (i < this.#targetExpr.parameters.length - 1) {
        this.#source += ',';
      }
    }

    this.#source += ') {\n';

    const prevTargetExpr = this.switchTargetExpr(this.#targetExpr.body);

    this.#depth++;
    this.walk();
    this.#depth--;

    this.#targetExpr = prevTargetExpr;

    this.#addSpaces();

    this.#source += '}\n';
  }

  expression() {
    this.#addSpaces();

    console.log('Found expression');

    if (Walker.#InvokeFunctions.includes(this.#targetExpr.mnemonic.toLowerCase())) {
      this.#foundStdInvokeFunctions.push(this.#targetExpr.mnemonic.toLowerCase());
      this.#targetExpr.mnemonic = `__${this.#targetExpr.mnemonic.toLowerCase()}`;
    }

    this.#source += `${this.#targetExpr.mnemonic}(`;

    const prevTargetExpr = this.switchTargetExpr(this.#targetExpr.body);

    this.walk();

    this.#targetExpr = prevTargetExpr;

    this.#source += ');\n'
  }

  invokeExpression() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    console.log('Found invoke expression');

    this.#foundMnemonicFunctions.push('invoke');

    this.#source += `__invoke(`;

    const isStdFunc = this.checkParametersForStdFunction('invoke');
    if (!isStdFunc) {
      this.replaceWithStringNode(0);
    }
    this.checkParametersForRegisters(1);

    const prevTargetExpr = this.switchTargetExpr(this.#targetExpr.body);

    this.walk();

    this.#targetExpr = prevTargetExpr;

    this.#source += ');\n'
  }

  pushExpression() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    console.log('Found push expression');

    this.#foundMnemonicFunctions.push('push');

    this.#source += `__push(`;

    this.checkParametersForRegisters();

    const prevTargetExpr = this.switchTargetExpr(this.#targetExpr.body);

    this.walk();

    this.#targetExpr = prevTargetExpr;

    this.#source += ');\n'
  }

  incExpression() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    console.log('Found inc expression');

    if (this.#targetExpr.body.length !== 1) {
      throw new Error('Inc Expression can only have a body of length 1!');
    }

    if (this.registers.includes(this.#targetExpr.body[0].value?.toLowerCase())) {
      this.#source += `__writeRegister(${this.#targetExpr.body[0].value}, __readRegister(${this.#targetExpr.body[0].value}) + 1);\n`;
    } else {
      this.#source += `${this.#targetExpr.body[0].value} += 1;\n`;
    }
  }

  decExpression() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    console.log('Found dec expression');

    if (this.#targetExpr.body.length !== 1) {
      throw new Error('Dec Expression can only have a body of length 1!');
    }

    if (this.registers.includes(this.#targetExpr.body[0].value?.toLowerCase())) {
      this.#source += `__writeRegister('${this.#targetExpr.body[0].value}', __readRegister('${this.#targetExpr.body[0].value}') - 1);\n`;
    } else {
      this.#source += `${this.#targetExpr.body[0].value} -= 1;\n`;
    }
  }

  sizestrStatement() {
    console.log('Found sizestr expression');

    this.#foundMnemonicFunctions.push('sizestr');

    this.#source += '__sizestr(';

    const prevTargetExpr = this.switchTargetExpr(this.#targetExpr.body);

    this.walk();

    this.#targetExpr = prevTargetExpr;

    this.#source += ')';
  }

  substrStatement() {
    console.log('Found substr expression');

    this.#foundMnemonicFunctions.push('substr');

    this.#source += '__substr(';

    const prevTargetExpr = this.switchTargetExpr([{type: 'Identifier', value: this.#targetExpr.variable}]);

    this.walk();

    this.#targetExpr = prevTargetExpr;

    this.#source += `, ${this.#targetExpr.position}${this.#targetExpr?.length ? `, ${this.#targetExpr?.length}` : ''})`;
  }

  catstrStatement() {
    console.log('Found catstr expression');

    this.#foundMnemonicFunctions.push('catstr');
    
    this.#source += '__catstr(';

    let prevTargetExpr = this.switchTargetExpr([{type: 'Identifier', value: this.#targetExpr.variable1}]);
    
    this.walk();

    this.#targetExpr = prevTargetExpr;

    this.#source += ', ';

    prevTargetExpr = this.switchTargetExpr([{type: 'Identifier', value: this.#targetExpr.variable2}]);
    
    this.walk();

    this.#targetExpr = prevTargetExpr;
    
    this.#source += ')';
  }

  errExpression() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    console.log('Found err expression');

    this.#source += `throw new Error(${this.#targetExpr.message});\n`;
  }

  errbExpression() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    console.log('Found errb expression');

    this.#source += 'if (';
    
    const prevTargetExpr = this.switchTargetExpr([{type: 'Identifier', value: this.#targetExpr.variable}]);

    this.walk();

    this.#targetExpr = prevTargetExpr;

    this.#source += '.length === 0) {\n';

    this.#depth++;

    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    this.#source += `throw new Error(${this.#targetExpr.message});\n`;

    this.#depth--;

    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    this.#source += '}\n';
  }

  errnbExpression() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    console.log('Found errnb expression');

    this.#source += 'if (';
    
    const prevTargetExpr = this.switchTargetExpr([{type: 'Identifier', value: this.#targetExpr.variable}]);

    this.walk();

    this.#targetExpr = prevTargetExpr;

    this.#source += '.length !== 0) {\n';

    this.#depth++;

    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    this.#source += `throw new Error(${this.#targetExpr.message});\n`;

    this.#depth--;

    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    this.#source += '}\n';
  }

  erreExpression() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    console.log('Found erre expression');

    this.#source += 'if (!';
    
    const prevTargetExpr = this.switchTargetExpr([{type: 'Identifier', value: this.#targetExpr.variable}]);

    this.walk();

    this.#targetExpr = prevTargetExpr;

    this.#source += ') {\n';

    this.#depth++;

    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    this.#source += `throw new Error(${this.#targetExpr.message});\n`;

    this.#depth--;

    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    this.#source += '}\n';
  }

  errnzExpression() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    console.log('Found errnz expression');

    this.#source += `if (`;

    const prevTargetExpr = this.switchTargetExpr([{type: 'Identifier', value: this.#targetExpr.variable}]);

    this.walk();

    this.#targetExpr = prevTargetExpr;

    this.#source += `) {\n`;

    this.#depth++;

    if (this.#allowSpaces) {
      this.#addSpaces();
    }
    
    this.#source += `throw new Error(${this.#targetExpr.message});\n`

    this.#depth--;

    if (this.#allowSpaces) {
      this.#addSpaces();
    }
    
    this.#source += `}\n`;
  }

  echoExpression() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    console.log('Found echo expression');

    this.#foundMnemonicFunctions.push('echo');

    this.#source += `__echo(`;

    const prevTargetExpr = this.switchTargetExpr([{type: 'Identifier', value: this.#targetExpr.message}]);

    this.walk();

    this.#targetExpr = prevTargetExpr;

    this.#source += ');\n'
  }

  callExpression() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    console.log('Found call expression');

    this.#foundMnemonicFunctions.push('call');

    this.#source += `__call(`;

    this.checkParametersForStdFunction('call');
    this.checkParametersForRegisters(1);

    const prevTargetExpr = this.switchTargetExpr(this.#targetExpr.body);

    this.walk();

    this.#targetExpr = prevTargetExpr;

    this.#source += ');\n'
  }

  moveExpression() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    console.log('Found move expression');

    this.#foundMnemonicFunctions.push('mov');

    this.#source += `__mov(`;

    this.replaceWithStringNodeIfRegister(0);

    const prevTargetExpr = this.switchTargetExpr(this.#targetExpr.body);

    this.walk();

    this.#targetExpr = prevTargetExpr;

    this.#source += ');\n'
  }

  jumpExpression() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    console.log('Found jump expression');

    this.#foundMnemonicFunctions.push('jmp');

    this.#source += `__jmp(`;

    const prevTargetExpr = this.switchTargetExpr(this.#targetExpr.body);

    this.walk();

    this.#targetExpr = prevTargetExpr;

    this.#source += ');\n'
  }

  labelDeclaration() {
    this.#addSpaces();

    this.#source += `const ${this.#targetExpr.name} = function() {\n`;

    const prevTargetExpr = this.switchTargetExpr(this.#targetExpr.body);

    this.#depth++;
    this.walk();
    this.#depth--;

    this.#targetExpr = prevTargetExpr;

    this.#addSpaces();

    this.#source += '};\n';

    this.#addSpaces();

    this.#source += `${this.#targetExpr.name}();\n`;
  }

  whileExpression() {
    this.#addSpaces();

    this.#source += 'while (';

    let prevTargetExpr = this.switchTargetExpr(this.#targetExpr.left);

    this.walk();

    this.#targetExpr = prevTargetExpr;

    this.#source += ` ${this.#targetExpr.operator} `;

    prevTargetExpr = this.switchTargetExpr(this.#targetExpr.right);

    this.walk();

    this.#targetExpr = prevTargetExpr;
    
    this.#source += ') {\n';

    prevTargetExpr = this.switchTargetExpr(this.#targetExpr.body);

    this.#depth++;
    this.walk();
    this.#depth--;

    this.#targetExpr = prevTargetExpr;

    this.#addSpaces();

    this.#source += '}\n';
  }

  walk() {
    this.#walkLength = this.#targetExpr.length;
    this.#walkIndex = 0;

    this.#parentTargetExpr = this.#targetExpr;

    for (const object of this.#targetExpr) {
      this.#prevTargetExpr = { type: undefined, value: undefined };
      this.#nextTargetExpr = { type: undefined, value: undefined };

      this.#prevTargetExpr = this.#parentTargetExpr[this.#walkIndex - 1];
      this.#nextTargetExpr = this.#parentTargetExpr[this.#walkIndex + 1];

      this.#targetExpr = object;

      this[`${object.type.slice(0, 1).toLowerCase()}${object.type.slice(1)}`]();

      this.#walkIndex++;
    }
  }

  addMnemonicFunctions() {
    let mnemonicFunctionSource = '';

    this.#foundMnemonicFunctions = [...new Set(this.#foundMnemonicFunctions)];

    for (const mnemonicFunction of this.#foundMnemonicFunctions) {
      if (MnemonicDecls.hasOwnProperty(mnemonicFunction)) {
        mnemonicFunctionSource += `  const __${mnemonicFunction} = ${MnemonicDecls[mnemonicFunction].toString().replace(/[\r\t\n]/g, '')};\n`;
      }
    }

    return mnemonicFunctionSource;
  }

  addStdFunctions() {
    let stdFunctionSource = '  const __std = {\n    call: {\n';

    this.#foundStdCallFunctions = [...new Set(this.#foundStdCallFunctions)];
    this.#foundStdInvokeFunctions = [...new Set(this.#foundStdInvokeFunctions)];

    for (const stdFunction of this.#foundStdCallFunctions) {
      if (StdDecls.call.hasOwnProperty(stdFunction)) {
        stdFunctionSource += `      ${stdFunction}: ${StdDecls.call[stdFunction].toString().replace(/[\r\t\n]/g, '')},\n`;
      }
    }
    
    stdFunctionSource += '    },\n    invoke: {\n';

    for (const stdFunction of this.#foundStdInvokeFunctions) {
      if (StdDecls.invoke.hasOwnProperty(stdFunction)) {
        stdFunctionSource += `      ${stdFunction}: ${StdDecls.invoke[stdFunction].toString().replace(/[\r\t\n]/g, '')},\n`;
      }
    }

    stdFunctionSource += '    }\n  };\n';

    this.#source = this.setup() + this.addMnemonicFunctions() + stdFunctionSource + this.#source + '})();\n'; 
  }

  getSource() {
    return this.#source;
  }
}
