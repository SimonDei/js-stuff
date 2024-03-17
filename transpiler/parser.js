import * as fs from 'fs';
import * as util from 'util';

/**
 * @typedef FunctionDeclaration
 * @property {string} [type='FunctionDeclaration']
 * @property {string} name
 * @property {string[]} parameters
 * @property {?string} returns
 * @property {boolean} async
 * @property {any[]} body
 * @property {any} parent
 */

/**
 * @typedef VariableDeclaration
 * @property {string} [type='VariableDeclaration']
 * @property {string} name
 * @property {boolean} mutable
 * @property {any[]} body
 * @property {any} parent
 */

/**
 * @typedef SetExpression
 * @property {string} [type='SetExpression']
 * @property {string} name
 * @property {string} value
 */

export default class Parser {
  /** @type {import('./tokenizer').Token[]} */
  #tokens = [];
  #index = 0;
  #expr = [];
  /** @type {any[] | (any & { body: any[], parent: any[] })} */
  #targetExpr = [];
  #currentFunction = undefined;
  #attempt = 5;
  
  /**
   * @param {import('./tokenizer').Token[]} tokens 
   */
  constructor(tokens) {
    this.#tokens = tokens;
    this.#targetExpr = this.#expr;
  }

  #advance(amount = 1) {
    this.#index += amount;
  }

  #peek(amount = 1) {
    return this.#tokens[this.#index + amount];
  }

  get #peekType() {
    return this.#tokens[this.#index + 1].type;
  }

  get #peekValue() {
    return this.#tokens[this.#index + 1].value;
  }

  #current() {
    return this.#tokens[this.#index];
  }

  get #currentType() {
    return this.#tokens[this.#index].type;
  }

  get #currentValue() {
    return this.#tokens[this.#index].value;
  }

  #pushDecl(decl) {
    if (Array.isArray(this.#targetExpr)) {
      this.#targetExpr.push(decl);
    } else {
      this.#targetExpr.body.push(decl);
    }
  }

  // ===========================================================================
  // ===========================================================================

  #globalsDeclaration() {
    const globalDeclaration = {
      type: 'GlobalsDeclaration',
      body: [],
      parent: this.#targetExpr
    };

    this.#advance();

    this.#targetExpr = globalDeclaration;

    this.parse('KEYWORD', 'endglobals');

    this.#targetExpr = globalDeclaration.parent;

    this.#advance();

    this.#pushDecl(globalDeclaration);
  }

  // ===========================================================================
  // ===========================================================================

  #variableDeclaration() {
    /** @type {VariableDeclaration} */
    const variableDecl = {
      type: 'VariableDeclaration',
      name: '',
      mutable: true,
      varType: '',
      body: [],
      parent: this.#targetExpr
    }

    if (this.#peekType === 'KEYWORD' && this.#peekValue.toLowerCase() === 'const') {
      this.#advance();
      variableDecl.mutable = false;
    }

    this.#advance();

    variableDecl.varType = this.#currentValue;

    this.#advance();

    variableDecl.name = this.#currentValue;

    if (this.#peek().type === 'OPERATOR' && this.#peek().value?.toLowerCase() === '=') {
      this.#advance(2);

      this.#targetExpr = variableDecl;

      this.parse('EOL');

      this.#targetExpr = variableDecl.parent;
    }

    this.#advance();

    this.#pushDecl(variableDecl);
  }

  // ===========================================================================
  // ===========================================================================

  #functionDeclaration() {
    /** @type {FunctionDeclaration} */
    const functionDecl = {
      type: 'FunctionDeclaration',
      name: '',
      body: [],
      parameters: [],
      returns: undefined,
      async: false,
      parent: this.#targetExpr
    };

    this.#currentFunction = functionDecl;

    this.#advance();

    if (this.#currentType === 'KEYWORD' && this.#currentValue.toLowerCase() === 'takes') {
      this.#advance();
    } else if (this.#currentType === 'IDENTIFIER' && this.#peekType === 'KEYWORD' && this.#peekValue.toLowerCase() === 'takes') {
      functionDecl.name = this.#currentValue;
      this.#advance(2);
    } else {
      this.#functionReference();
      return;
    }

    functionDecl.parameters = this.#functionParameterDeclaration();

    this.#advance();

    functionDecl.returns = this.#currentValue;

    this.#advance();

    this.#targetExpr = functionDecl;

    this.parse('KEYWORD', 'endfunction');

    this.#advance();

    this.#targetExpr = functionDecl.parent;

    this.#pushDecl(functionDecl);

    this.#currentFunction = undefined;
  }

  #functionParameterDeclaration() {
    const parameters = [];

    while (this.#peek().type !== 'KEYWORD' && this.#peek().value?.toLowerCase() !== 'returns') {
      parameters.push(this.#currentValue);
      this.#advance();
    }

    parameters.push(this.#currentValue);
    this.#advance();

    return parameters;
  }

  // ===========================================================================
  // ===========================================================================

  #doExpression() {
    const doExpression = {
      type: 'DoExpression',
      async: false,
      body: [],
      parent: this.#targetExpr
    };

    const prevCurrentFunction = this.#currentFunction;
    this.#currentFunction = doExpression;

    this.#advance();

    this.#targetExpr = doExpression;

    this.parse('KEYWORD', 'enddo');

    this.#advance();

    this.#targetExpr = doExpression.parent;

    this.#pushDecl(doExpression);

    this.#currentFunction = prevCurrentFunction;
  }

  // ===========================================================================
  // ===========================================================================

  #setExpression() {
    const setExpression = {
      type: 'SetExpression',
      name: '',
      body: [],
      parent: this.#targetExpr
    };

    this.#advance();

    setExpression.name = this.#currentValue;

    this.#advance(2);

    this.#targetExpr = setExpression;

    this.parse('EOL');

    this.#targetExpr = setExpression.parent;

    this.#advance();

    this.#pushDecl(setExpression);
  }

  // ===========================================================================
  // ===========================================================================

  #returnExpression() {
    const returnExpression = {
      type: 'ReturnExpression',
      name: ''
    };

    this.#advance();

    returnExpression.name = this.#currentValue;

    this.#advance();

    this.#pushDecl(returnExpression);
  }

  // ===========================================================================
  // ===========================================================================

  #ifStatement() {
    const ifStatement = {
      type: 'IfStatement',
      test: [],
      then: [],
      else: undefined,
      parent: this.#targetExpr
    };

    this.#advance();

    this.#targetExpr = ifStatement.test;

    this.parse('KEYWORD', 'then');

    this.#targetExpr = ifStatement.parent;

    /*
    while (this.#peekType !== 'KEYWORD' || this.#peekValue !== 'then') {
      ifStatement.test += this.#currentValue + ' ';
      this.#advance();
    }

    ifStatement.test += this.#currentValue;
     */

    this.#advance(2);

    this.#targetExpr = ifStatement.then;

    const { endValue } = this.parse('KEYWORD', ['endif', 'else']);

    if (endValue === 'else') {
      this.#advance();

      ifStatement.else = [];
      this.#targetExpr = ifStatement.else;

      this.parse('KEYWORD', 'endif');
    }

    this.#advance();

    this.#targetExpr = ifStatement.parent;

    this.#pushDecl(ifStatement);
  }

  // ===========================================================================
  // ===========================================================================

  #callExpression(nested = false) {
    const callExpression = {
      type: 'CallExpression',
      name: '',
      async: false,
      body: [],
      parent: this.#targetExpr
    };

    if (!nested) {
      this.#advance();
    }

    if (this.#currentType === 'KEYWORD' && this.#currentValue.toLowerCase() === 'await') {
      callExpression.async = true;
      if (this.#currentFunction) {
        this.#currentFunction.async = true;
      }
      this.#advance();
    }

    callExpression.name = this.#currentValue;

    this.#advance(2);

    this.#targetExpr = callExpression;

    this.parse('RPAREN');

    this.#targetExpr = callExpression.parent;

    /*
    while (this.#currentType !== 'RPAREN') {
      if (this.#currentType === 'OPERATOR' && this.#currentValue === ',') {
        this.#advance();
        continue;
      }

      if (this.#currentType === 'KEYWORD' && this.#currentValue.toLowerCase() === 'function') {
        callExpression.parameters.push(this.#functionReference());
        continue;
      }

      callExpression.parameters.push(this.#staticValue());
      this.#advance();
    }
    */

    this.#advance();

    this.#pushDecl(callExpression);
  }

  // ===========================================================================
  // ===========================================================================

  #staticValue() {
    const staticValue = {
      type: 'StaticValue',
      name: ''
    };

    staticValue.name = this.#currentValue;

    return staticValue;
  }

  // ===========================================================================
  // ===========================================================================

  #functionReference() {
    const functionReference = {
      type: 'FunctionReference',
      name: ''
    };

    // this.#advance();

    functionReference.name = this.#currentValue;

    this.#advance();

    this.#pushDecl(functionReference);
  }

  // ===========================================================================
  // ===========================================================================

  #loopStatement() {
    const loopStatement = {
      type: 'LoopStatement',
      exitwhen: undefined,
      body: [],
      parent: this.#targetExpr
    };

    this.#advance();

    this.#targetExpr = loopStatement;

    this.parse('KEYWORD', 'endloop');

    this.#advance();

    this.#targetExpr = loopStatement.parent;

    this.#pushDecl(loopStatement);
  }

  // ===========================================================================
  // ===========================================================================

  #exitwhenExpression() {
    const exitwhenExpression = {
      type: 'ExitwhenExpression',
      body: [],
      parent: this.#targetExpr
    };

    this.#advance();

    this.#targetExpr = exitwhenExpression;

    this.parse('EOL');

    this.#targetExpr = exitwhenExpression.parent;

    this.#targetExpr.exitwhen = exitwhenExpression;

    /*
    let test = '';
    while (this.#peekType !== 'EOL') {
      test += this.#currentValue + ' ';
      this.#advance();
    }

    test += this.#currentValue;

    this.#advance();

    this.#targetExpr.exitwhen = test;
     */
  }

  // ===========================================================================
  // ===========================================================================

  #number() {
    const number = {
      type: 'Number',
      value: ''
    };

    number.value = this.#currentValue;

    this.#advance();

    this.#pushDecl(number);
  }

  #operator() {
    if (this.#currentValue === '//') {
      const comment = {
        type: 'Comment',
        body: []
      };

      this.#advance();

      const prevTargetExpr = this.#targetExpr;
      this.#targetExpr = comment;

      this.parse('EOL');

      this.#targetExpr = prevTargetExpr;

      this.#pushDecl(comment);

      return;
    }

    const operator = {
      type: 'Operator',
      value: ''
    };

    operator.value = this.#currentValue;

    this.#advance();

    this.#pushDecl(operator);
  }

  #identifier() {
    const identifier = {
      type: 'Identifier',
      value: ''
    };

    if (this.#peekType === 'LPAREN') {
      this.#callExpression(true);
      return;
    }

    identifier.value = this.#currentValue;

    this.#advance();

    this.#pushDecl(identifier);
  }

  #string() {
    const string = {
      type: 'String',
      value: ''
    };

    string.value = this.#currentValue;

    this.#advance();

    this.#pushDecl(string);
  }

  // ===========================================================================
  // ===========================================================================

  #keyword() {
    switch (this.#currentValue.toLowerCase()) {
      case 'globals':
        this.#globalsDeclaration();
        break;

      case 'function':
        this.#functionDeclaration();
        break;

      case 'do':
        this.#doExpression();
        break;
      
      case 'local':
        this.#variableDeclaration();
        break;
      
      case 'set':
        this.#setExpression();
        break;

      case 'return':
        this.#returnExpression();
        break;

      case 'if':
        this.#ifStatement();
        break;

      case 'call':
        this.#callExpression();
        break;

      case 'loop':
        this.#loopStatement();
        break;

      case 'exitwhen':
        this.#exitwhenExpression();
        break;
    }
  }

  parse(endType = 'EOF', endValue = undefined, skipEol = true) {
    while (this.#currentType !== endType || (Array.isArray(endValue) ? !endValue.includes(this.#currentValue?.toLocaleLowerCase()) : this.#currentValue?.toLowerCase() !== endValue)) {
      if (this.#attempt <= 0) {
        return;
      }

      if (skipEol && this.#currentType === 'EOL') {
        this.#advance();
        continue;
      }

      switch (this.#currentType) {
        case 'KEYWORD':
          this.#keyword();
          break;

        case 'NUMBER':
          this.#number();
          break;

        case 'OPERATOR':
          this.#operator();
          break;

        case 'IDENTIFIER':
          this.#identifier();
          break;

        case 'STRING':
          this.#string();
          break;

        default:
          this.#attempt--;
      }
    }

    return {
      ast: this.#targetExpr,
      endType: this.#currentType,
      endValue: this.#currentValue
    };
  }

  writeAst() {
    fs.writeFileSync('./ast.txt', util.inspect(this.#targetExpr, false, 1000), { encoding: 'utf-8' });
  }
}
