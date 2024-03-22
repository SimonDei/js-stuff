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
  static #NATIVE_TYPES = {
    'nothing': 'void',
    'real': 'number',
    'integer': 'number',
    'string': 'string',
    'boolean': 'boolean'
  };

  /** @type {import('./tokenizer').Token[]} */
  #tokens = [];
  #index = 0;
  #expr = [];
  /** @type {any[] | (any & { body: any[], parent: any[] })} */
  #targetExpr = [];
  #currentFunction = undefined;
  #nestedCallExpr = false;
  #nestedCallNameExpr = false;
  #attempt = 5;

  /**
   * @param {import('./tokenizer').Token[]} tokens 
   */
  constructor(tokens) {
    this.#tokens = tokens;
    this.#targetExpr = this.#expr;
  }

  reset(tokens) {
    this.#tokens = tokens;
    this.#targetExpr = [];
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

    this.parse('KEYWORD', 'end');

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
      varType: '',
      body: [],
      parent: this.#targetExpr
    }

    if (this.#targetExpr.type !== 'GlobalsDeclaration') {
      this.#advance();
    }

    // variableDecl.varType = this.#currentValue;

    // this.#advance();

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

  #constantDeclaration() {
    const constantDecl = {
      type: 'ConstantDeclaration',
      name: '',
      varType: '',
      body: [],
      parent: this.#targetExpr
    }

    this.#advance();

    // constantDecl.varType = this.#currentValue;

    // this.#advance();

    constantDecl.name = this.#currentValue;

    if (this.#peek().type === 'OPERATOR' && this.#peek().value?.toLowerCase() === '=') {
      this.#advance(2);

      this.#targetExpr = constantDecl;

      this.parse('EOL');

      this.#targetExpr = constantDecl.parent;
    }

    this.#advance();

    this.#pushDecl(constantDecl);
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

    if (this.#currentType === 'LPAREN') {
      this.#advance();
    } else if (this.#currentType === 'IDENTIFIER' && this.#peekType === 'LPAREN') {
      functionDecl.name = this.#currentValue;
      this.#advance(2);
    } else {
      this.#functionReference();
      return;
    }

    /*
    if (this.#currentType === 'KEYWORD' && this.#currentValue.toLowerCase() === 'takes') {
      this.#advance();
    } else if (this.#currentType === 'IDENTIFIER' && this.#peekType === 'KEYWORD' && this.#peekValue.toLowerCase() === 'takes') {
      functionDecl.name = this.#currentValue;
      this.#advance(2);
    } else {
      this.#functionReference();
      return;
    }
    */

    functionDecl.parameters = this.#functionParameterDeclaration();

    this.#advance();

    // functionDecl.returns = this.#currentValue;

    // this.#advance();

    this.#targetExpr = functionDecl;

    this.parse('KEYWORD', 'end');

    this.#advance();

    this.#targetExpr = functionDecl.parent;

    this.#pushDecl(functionDecl);

    this.#currentFunction = undefined;
  }

  #functionParameterDeclaration() {
    const parameters = [];

    while (true) {
      /*
      if (this.#currentValue === 'nothing') {
        parameters.push({ type: this.#currentValue, value: this.#currentValue });
        this.#advance();

        if (this.#currentType === 'KEYWORD' && this.#currentValue === 'returns') {
          break;
        }
      } else {
        const parameter = { type: '', value: '' };
        
        parameter.type = this.#currentValue;
        this.#advance();

        parameter.value = this.#currentValue;
        this.#advance();

        if (this.#currentType === 'KEYWORD' && this.#currentValue === 'returns') {
          parameters.push(parameter);
          break;
        }

        if (this.#currentType === 'OPERATOR' && this.#currentValue === ',') {
          this.#advance();
        }

        parameters.push(parameter);
      }
      */

      if (this.#currentType === 'RPAREN') {
        this.#advance();
        break;
      }

      if (this.#currentType === 'OPERATOR' && this.#currentValue === ',') {
        this.#advance();
        continue;
      }

      parameters.push(this.#currentValue);
      this.#advance();
    }

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

    this.parse('KEYWORD', 'end');

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
      left: [],
      right: [],
      parent: this.#targetExpr
    };

    this.#advance();

    this.#targetExpr = setExpression.left;

    this.parse('OPERATOR', '=');
    
    this.#advance();

    this.#targetExpr = setExpression.right;

    this.parse('EOL');

    this.#targetExpr = setExpression.parent;

    this.#pushDecl(setExpression);
  }

  // ===========================================================================
  // ===========================================================================

  #returnExpression() {
    const returnExpression = {
      type: 'ReturnExpression',
      body: [],
      parent: this.#targetExpr
    };

    this.#advance();

    this.#targetExpr = returnExpression.body;

    this.parse('EOL');

    this.#targetExpr = returnExpression.parent;

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

    const { endValue } = this.parse('KEYWORD', ['end', 'else']);

    if (endValue === 'else') {
      this.#advance();

      ifStatement.else = [];
      this.#targetExpr = ifStatement.else;

      this.parse('KEYWORD', 'end');
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
      name: [],
      async: false,
      body: [],
      parent: this.#targetExpr
    };

    if (!nested || !this.#nestedCallExpr) {
      this.#advance();
    }

    if (this.#currentType === 'KEYWORD' && this.#currentValue.toLowerCase() === 'await') {
      callExpression.async = true;
      if (this.#currentFunction) {
        this.#currentFunction.async = true;
      }
      this.#advance();
    }

    this.#targetExpr = callExpression.name;

    this.#nestedCallNameExpr = true;
    console.log(this.#currentType, this.#currentValue)

    this.parse('LPAREN');

    this.#nestedCallNameExpr = false;

    this.#targetExpr = callExpression.parent;

    this.#advance();

    this.#targetExpr = callExpression;

    const prevNestedCallExpr = this.#nestedCallExpr;
    this.#nestedCallExpr = true;

    this.parse('RPAREN');

    this.#nestedCallExpr = prevNestedCallExpr;

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

    this.parse('KEYWORD', 'end');

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

  #object() {
    const objectDeclaration = {
      type: 'ObjectDeclaration',
      body: []
    };

    this.#advance();

    const prevTargetExpr = this.#targetExpr;
    this.#targetExpr = objectDeclaration;

    this.parse('RBRACE');

    this.#targetExpr = prevTargetExpr;

    this.#advance();

    this.#pushDecl(objectDeclaration);
  }

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
      value: '',
      parent: this.#targetExpr
    };

    if (this.#peekType === 'LPAREN' && !this.#nestedCallNameExpr) {
      this.#nestedCallExpr = true;
      this.#callExpression(true);
      this.#nestedCallExpr = false;
      return;
    }

    identifier.value = this.#currentValue;

    this.#advance();

    this.#pushDecl(identifier);
  }

  #nilExpression() {
    const nilExpression = {
      type: 'NilExpression',
      parent: this.#targetExpr
    };

    this.#advance();

    this.#pushDecl(nilExpression);
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

  #debugExpression() {
    const debugExpression = {
      type: 'DebugExpression'
    };

    this.#advance();

    this.#pushDecl(debugExpression);
  }

  // ===========================================================================
  // ===========================================================================

  #keyword() {
    if (Object.keys(Parser.#NATIVE_TYPES).includes(this.#currentValue.toLowerCase()) && this.#targetExpr.type === 'GlobalsDeclaration') {
      this.#variableDeclaration();
      return;
    }

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
      
      case 'constant':
        this.#constantDeclaration();
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

      case 'debug':
        this.#debugExpression();
        break;

      case 'nil':
        this.#nilExpression();
        break;

      case 'is':
      case 'not':
      case 'new':
      case 'null':
        this.#operator();
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

        case 'LBRACE':
          this.#object();
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
}
