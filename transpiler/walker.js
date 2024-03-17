import * as fs from 'fs';
import StdDecls from './stdfunctions.js';

export default class Walker {
  static #STDFUNCTIONS = Object.keys(StdDecls);

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

  globalsDeclaration() {

  }

  functionDeclaration() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    this.#source += `/** @returns {${this.#targetExpr.returns === 'nothing' ? 'void' : this.#targetExpr.returns}} */ `;

    if (this.#targetExpr.async) {
      this.#source += 'async ';
    }

    this.#source += `function ${this.#targetExpr.name}(`;

    this.#targetExpr.parameters
      .filter(e => e !== 'nothing')
      .forEach((e, i, arr) => {
        if (i < arr.length - 1) {
          this.#source += `${e}, `;
          return;
        }

        this.#source += e;
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

    if (this.#targetExpr.mutable) {
      this.#source += 'let ';
    } else {
      this.#source += 'const ';
    }

    this.#source += `/** @type {${this.#targetExpr.varType}} */ ${this.#targetExpr.name} = `;

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

    this.#source += `${this.#targetExpr.name} = `;

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

  callExpression() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    if (Walker.#STDFUNCTIONS.includes(this.#targetExpr.name)) {
      this.#foundStdFunctions.push(this.#targetExpr.name);
      this.#targetExpr.name = `__${this.#targetExpr.name}`;
    }

    if (this.#targetExpr.async) {
      this.#source += 'await ';
    }

    this.#source += `${this.#targetExpr.name}(`;

    const prevTargetExpr = this.#targetExpr;
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

    this.#source += `return ${this.#targetExpr.name};\n`;
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
    this.#source += this.#targetExpr.value;

    if (this.#walkIndex < this.#walkLength - 1 && this.#nextTargetExpr?.value !== '->') {
      this.#source += ' ';
    }
  }

  operator() {
    if (this.#targetExpr.value === '->') {
      this.#source += '.';
      return;
    }

    this.#source += this.#targetExpr.value;

    if (this.#walkIndex < this.#walkLength - 1) {
      this.#source += ' ';
    }
  }

  comment() {
    if (this.#allowSpaces) {
      this.#addSpaces();
    }

    this.#source += `// ${this.#targetExpr.body.map(e => e.value ?? '').join(' ')}\n`;
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

  writeSource() {
    fs.writeFileSync('./source.js', this.#source, { encoding: 'utf-8' });
  }
}
