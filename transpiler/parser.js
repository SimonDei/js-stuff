/**
 * @typedef FunctionDeclaration
 * @property {string} [type='FunctionDeclaration']
 * @property {string} name
 * @property {string[]} parameters
 * @property {?string} returns
 * @property {any[]} body
 * @property {any} parent
 */

/**
 * @typedef VariableDeclaration
 * @property {string} [type='VariableDeclaration']
 * @property {string} name
 * @property {boolean} mutable
 * @property {?string} value
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
  /** @type {any[] | ({ [key: string]: any } & { body: any[] })} */
  #targetExpr = [];
  
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

  #variableDeclaration() {
    /** @type {VariableDeclaration} */
    const variableDecl = {
      type: 'VariableDeclaration',
      name: '',
      mutable: false,
      value: undefined
    }

    if (this.#peekType === 'KEYWORD' && this.#peekValue.toLowerCase() === 'mut') {
      this.#advance();
      variableDecl.mutable = true;
    }

    this.#advance();

    variableDecl.name = this.#currentValue;

    if (this.#peek().type === 'OPERATOR' && this.#peek().value?.toLowerCase() === '=') {
      this.#advance(2);
      variableDecl.value = this.#currentValue;
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
      parent: this.#targetExpr
    };

    this.#advance();

    functionDecl.name = this.#currentValue;

    this.#advance(2);

    functionDecl.parameters = this.#functionParameterDeclaration();

    this.#advance();

    functionDecl.returns = this.#currentValue;

    this.#advance();

    this.#targetExpr = functionDecl;

    this.parse('KEYWORD', 'endfunction');

    this.#advance();

    this.#targetExpr = functionDecl.parent;

    this.#pushDecl(functionDecl);
  }

  #functionParameterDeclaration() {
    /** @type {string[]} */
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

  #setExpression() {
    const setExpression = {
      type: 'SetExpression',
      name: '',
      value: ''
    };

    this.#advance();

    setExpression.name = this.#currentValue;

    this.#advance(2);

    setExpression.value = this.#currentValue;

    console.log(this.#currentType, this.#currentValue)

    this.#advance();

    console.log(this.#currentType, this.#currentValue)
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
      test: '',
      then: [],
      else: undefined,
      parent: this.#targetExpr
    };

    this.#advance();

    while (this.#peekType !== 'KEYWORD' || this.#peekValue !== 'then') {
      ifStatement.test += this.#currentValue + ' ';
      this.#advance();
    }

    ifStatement.test += this.#currentValue;

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

  #callExpression() {
    const callExpression = {
      type: 'CallExpression',
      name: '',
      parameters: []
    };

    this.#advance();

    callExpression.name = this.#currentValue;

    this.#advance(2);

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

    this.#advance();

    functionReference.name = this.#currentValue;

    this.#advance();

    return functionReference;
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
    this.#advance();

    let test = '';
    while (this.#peekType !== 'EOL') {
      test += this.#currentValue + ' ';
      this.#advance();
    }

    test += this.#currentValue;

    this.#advance();

    this.#targetExpr.exitwhen = test;
  }

  // ===========================================================================
  // ===========================================================================

  #keyword() {
    console.log(this.#currentType, this.#currentValue)

    switch (this.#currentValue.toLowerCase()) {
      case 'function':
        this.#functionDeclaration();
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
      if (skipEol && this.#currentType === 'EOL') {
        this.#advance();
        continue;
      }

      switch (this.#currentType) {
        case 'KEYWORD':
          this.#keyword();
          break;
      }
    }

    return {
      ast: this.#targetExpr,
      endType: this.#currentType,
      endValue: this.#currentValue
    };
  }
}
