export default class Walker {
  #ast = [];
  #targetExpr = [];
  #depth = 0;
  #separator = '';
  #walkIndex = 0;
  #walkLength = 0;
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

  functionDeclaration() {
    this.#addSpaces();

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

    this.walk();

    this.#depth--;

    this.#targetExpr = prevTargetExpr;

    this.#source += '}\n';

    this.#addSpaces();
  }

  variableDeclaration() {
    this.#addSpaces();

    if (this.#targetExpr.mutable) {
      this.#source += 'let ';
    } else {
      this.#source += 'const ';
    }

    this.#source += `${this.#targetExpr.name} = ${this.#targetExpr.value};\n`;
  }

  ifStatement() {
    this.#addSpaces();

    this.#source += `if (${this.#targetExpr.test}) {\n`;

    let prevTargetExpr = this.#targetExpr;
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

    this.#source += `${this.#targetExpr.name} = ${this.#targetExpr.value};\n`;
  }

  callExpression() {
    this.#addSpaces();

    this.#source += `${this.#targetExpr.name}(`;

    const prevTargetExpr = this.#targetExpr;
    this.#targetExpr = this.#targetExpr.parameters;

    this.#separator = ', ';

    this.walk();

    this.#separator = '';

    this.#targetExpr = prevTargetExpr;

    this.#source += ');\n';
  }

  staticValue() {
    this.#source += this.#targetExpr.name;

    if (this.#separator && this.#walkIndex < this.#walkLength - 1) {
      this.#source += this.#separator;
    }
  }

  functionReference() {
    this.#source += `${this.#targetExpr.name}()`;

    if (this.#separator && this.#walkIndex < this.#walkLength - 1) {
      this.#source += this.#separator;
    }
  }

  loopStatement() {
    this.#addSpaces();

    this.#source += `while (${this.#targetExpr.exitwhen}) {\n`;

    const prevTargetExpr = this.#targetExpr;
    this.#targetExpr = this.#targetExpr.body;

    this.#depth++;

    this.walk();

    this.#depth--;

    this.#targetExpr = prevTargetExpr;

    this.#addSpaces();

    this.#source += '}\n';
  }

  returnExpression() {
    this.#addSpaces();

    this.#source += `return ${this.#targetExpr.name};\n`;
  }

  walk() {
    this.#walkLength = this.#targetExpr.length;
    this.#walkIndex = 0;

    for (const object of this.#targetExpr) {
      this.#targetExpr = object;
      this[`${object.type.slice(0, 1).toLowerCase()}${object.type.slice(1)}`]();

      this.#walkIndex++;
    }
  }

  getSource() {
    return this.#source;
  }
}
