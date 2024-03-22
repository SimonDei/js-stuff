import StdDecls from './stdfunctions.js';

export default class Walker {
  static #STDFUNCTIONS = Object.keys(StdDecls);

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
    'is': '===',
    '!=': '!==',
    'not': '!=='
  };

  #ast = [];
  #prevTargetExpr = {};
  #nextTargetExpr = {};
  #parentTargetExpr = [];
  #targetExpr = [];
  #depth = 0;
  #separator = '';
  #allowSpaces = true;
  #allowSemi = true;
  #walkIndex = 0;
  #walkLength = 0;
  #foundStdFunctions = [];
  #nestedCallStack = 0;
  #source = '';

  constructor(ast) {
    this.#ast = ast;
    this.#targetExpr = this.#ast;
  }

  #addSpaces() {
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

    this.#source += `function ${this.#targetExpr.name}(`;

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

    this.#source += `let ${this.#targetExpr.name} = `; //`let ${this.#addJsDocType(this.#targetExpr.varType)} ${this.#targetExpr.name} = `;

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
    this.#targetExpr = this.#targetExpr.test;

    const prevSpaces = this.#allowSpaces;
    const prevSemi = this.#allowSemi;

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

  callExpression() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    const simpleCallName = this.#targetExpr.name.reduce((acc, val) => acc + val?.value ?? '', '');

    if (Walker.#STDFUNCTIONS.includes(simpleCallName)) {
      this.#foundStdFunctions.push(simpleCallName);
      this.#targetExpr.name = [ { type: 'Identifier', value: `__${simpleCallName}`, parent: this.#targetExpr } ];
    }

    if (this.#targetExpr.async) {
      this.#source += 'await ';
    }

    let prevTargetExpr = this.#targetExpr;
    this.#targetExpr = this.#targetExpr.name;

    this.walk();

    this.#targetExpr = prevTargetExpr;

    this.#source += '(';
    // this.#source += `${this.#targetExpr.name}(`;

    this.#targetExpr = this.#targetExpr.body;

    const prevAllowSpaces = this.#allowSpaces;
    const prevAllowSemi = this.#allowSemi;

    this.#separator = ', ';
    this.#allowSpaces = false;
    this.#allowSemi = false;
    this.#nestedCallStack++;

    this.walk();

    this.#targetExpr = prevTargetExpr;

    this.#separator = '';
    this.#allowSpaces = prevAllowSpaces;
    this.#allowSemi = prevAllowSemi;
    this.#nestedCallStack--;

    this.#source += `)`;

    if (this.#allowSemi && this.#nestedCallStack === 0) {
      this.#source += ';\n';
    }
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
    this.#targetExpr = this.#targetExpr.body;

    this.walk();

    this.#targetExpr = prevTargetExpr;

    this.#source += ';\n';
  }

  nilExpression() {
    if (['is', 'not', '===', '!=='].includes(this.#prevTargetExpr.value)) {
      this.#source = this.#source.slice(0, -2);
    }

    this.#source += ' null';
  }

  objectDeclaration() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    this.#source += `{`;
    
    if (this.#targetExpr.body.length !== 0 && (this.#targetExpr.body.length - 3) % 4 !== 0) {
      throw new Error('Wrong amount of arguments for object');
    }

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

    this.#source += '}';
  }

  number() {
    this.#source += this.#targetExpr.value;

    if (this.#separator && this.#walkIndex < this.#walkLength - 1) {
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
    if (this.#targetExpr.parent.type === 'GlobalsDeclaration') {
      if (this.#allowSpaces) {
        this.#addSpaces();
      }

      this.#source += 'const ';
    }

    this.#source += this.#targetExpr.value;

    if (this.#walkIndex < this.#walkLength - 1 && this.#nextTargetExpr?.value !== '.' && this.#allowSpaces) {
      this.#source += ' ';
    }
  }

  operator() {
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

    if (this.#walkIndex < this.#walkLength - 1 && this.#targetExpr.value !== '.' && this.#allowSpaces) {
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

  addStdFunctions() {
    let stdFunctionSource = '';

    this.#foundStdFunctions = [...new Set(this.#foundStdFunctions)];

    for (const stdFunction of this.#foundStdFunctions) {
      if (StdDecls.hasOwnProperty(stdFunction)) {
        stdFunctionSource += `const __${stdFunction} = ${StdDecls[stdFunction].toString()};\n`;
      }
    }

    this.#source = stdFunctionSource + this.#source;
  }

  getSource() {
    return this.#source;
  }
}
