(function() {
  /**
   * @typedef Token
   * @property {string} type
   * @property {string} [value]
   */

  class Scanner {
    static #KEYWORDS = [
      'nothing', 'null', 'string', 'integer', 'real', 'boolean', 'object',
      'globals', 'endglobals',
      'function', 'endfunction', 'await',
      'takes', 'returns',
      'do', 'enddo',
      'local', 'const', 'set', 'return',
      'if', 'then', 'else', 'elseif', 'endif',
      'loop', 'exitwhen', 'endloop',
      'call'
    ];

    /** @type {Token[]} */
    #tokens = [];

    #isNumber(str) {
      return /^\d+$/.test(str);
    }

    #isAlphaNumeric(str) {
      return /[A-Za-z0-9_]+/.test(str);
    }

    #isKeyword(str) {
      return Scanner.#KEYWORDS.includes(str.toLowerCase());
    }

    #isOperator(str) {
      return /^[+*\/-=.,<>]+$/.test(str);
    }

    /**
     * @param {string} str
     * @returns {Token[]}
     */
    tokenize(str) {
      let token = '';

      for (let index = 0; index < str.length; index++) {
        token += str[index];

        if (token === '\n' || token === '\r\n') {
          this.#tokens.push({type: 'EOL'});

          token = '';
          continue;
        }

        token = token.trim();

        const peek = str[index + 1];

        if (token === '"') {
          let strValue = '"';
          index++;

          while (str[index] !== '"') {
            strValue += str[index];
            index++;
          }

          strValue += str[index];

          this.#tokens.push({type: 'STRING', value: strValue});

          token = '';
          continue;
        }

        if (this.#isNumber(token) && !this.#isNumber(peek)) {
          this.#tokens.push({type: 'NUMBER', value: token});

          token = '';
          continue;
        }

        if (token === '(' || token === ')') {
          token === '('
          ? this.#tokens.push({type: 'LPAREN'})
          : this.#tokens.push({type: 'RPAREN'});

          token = '';
          continue;
        }

        if (token === '{' || token === '}') {
          token === '{'
          ? this.#tokens.push({type: 'LBRACE'})
          : this.#tokens.push({type: 'RBRACE'});

          token = '';
          continue;
        }

        if (this.#isAlphaNumeric(token) && !this.#isAlphaNumeric(peek)) {
          if (this.#isKeyword(token)) {
            this.#tokens.push({type: 'KEYWORD', value: token});
          } else {
            this.#tokens.push({type: 'IDENTIFIER', value: token});
          }

          token = '';
          continue;
        }

        if (this.#isOperator(token) && !this.#isOperator(peek)) {
          this.#tokens.push({type: 'OPERATOR', value: token});

          token = '';
        }
      }

      this.#tokens.push({type: 'EOF'});

      return this.#tokens;
    }
  }

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

  class Parser {
    /** @type {import('./tokenizer').Token[]} */
    #tokens = [];
    #index = 0;
    #expr = [];
    /** @type {any[] | (any & { body: any[], parent: any[] })} */
    #targetExpr = [];
    #currentFunction = undefined;
    #attempt = 5;

    /**
     * @param {?(import('./tokenizer').Token[])} tokens
     */
    constructor(tokens) {
      this.#tokens = tokens ?? [];
      this.#targetExpr = this.#expr;
    }

    reset(newTokens) {
      this.#tokens = newTokens;
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

      const {endValue} = this.parse('KEYWORD', ['endif', 'else']);

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
  }

  const StdDecls = {};

  StdDecls.ToInteger = function(value) {
    return Number.parseInt(value);
  };

  StdDecls.ToFloat = function(value) {
    return Number.parseFloat(value);
  };

  StdDecls.ToString = function(value) {
    return value?.toString() ?? '';
  };

  StdDecls.ToBoolean = function(value) {
    return Boolean(value);
  };

  StdDecls.I2S = function(value) {
    return value.toString();
  };

  StdDecls.S2I = function(value) {
    return Number.parseInt(value);
  };

  StdDecls.SubString = function(value, start, end) {
    return value.substring(start, end);
  };

  StdDecls.StringLength = function(value) {
    return value.length;
  };

  StdDecls.Assert = function(test, message) {
    if (!test) {
      throw new Error(message);
    }
  };

  StdDecls.Byte = function(value) {
    return new TextEncoder().encode(value);
  };

  StdDecls.Char = function(value) {
    return value.charCodeAt(0);
  };

  StdDecls.Find = function(needle, haystack) {
    return haystack.find(e => e === needle);
  };

  StdDecls.TypeOf = function(value) {
    return Object.prototype.toString.call(value);
  };

  StdDecls.Pairs = function(object) {
    return Object.entries(object);
  };

  StdDecls.Add = function(a, b) {
    return a + b;
  };

  StdDecls.Sub = function(a, b) {
    return a - b;
  };

  StdDecls.Mul = function(a, b) {
    return a * b;
  };

  StdDecls.Div = function(a, b) {
    return a / b;
  };

  StdDecls.Pow = function(a, b) {
    return Math.pow(a, b);
  };

  StdDecls.Print = function(message) {
    console.log(message);
  };

  StdDecls.Log = function(value) {
    console.log(value);
  };

  StdDecls.Info = function(value) {
    console.info(value)
  };

  StdDecls.Array = function(...values) {
    return [...values];
  };

  StdDecls.Length = function(value) {
    return value?.length ?? 0;
  };

  StdDecls.At = function(array, index) {
    return array[index];
  };

  StdDecls.Upper = function(value) {
    return value.toUpperCase();
  };

  StdDecls.Lower = function(value) {
    return value.toLowerCase();
  };

  StdDecls.ForEach = function(array, func) {
    for (const item of array) {
      func(item);
    }
  };

// ========================================================================================
// Clipboard Functions
// ========================================================================================

  StdDecls.WriteClipboard = async function(message) {
    return window.clipboard.writeText(message);
  };

  StdDecls.ReadClipboard = async function() {
    return window.clipboard.readText();
  };

// ========================================================================================
// User Interaction Functions
// ========================================================================================

  StdDecls.Alert = function(message) {
    alert(message);
  };

  StdDecls.Confirm = function(message) {
    return confirm(message);
  };

// ========================================================================================
// Ajax Functions
// ========================================================================================

  StdDecls.Fetch = async function(url) {
    return fetch(url);
  };

  StdDecls.FetchJson = async function(url) {
    return fetch(url).then(resp => resp.json());
  };

  StdDecls.FetchText = async function(url) {
    return fetch(url).then(resp => resp.text());
  };

// ========================================================================================
// DOM Functions
// ========================================================================================

  StdDecls.QuerySelector = function(selector, context = document) {
    return context.querySelector(selector);
  };

  StdDecls.QuerySelectorAll = function(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  };

  StdDecls.SetAttr = function(element, name, value) {
    if (typeof element === 'string') {
      element = Array.from(document.querySelectorAll(element));
    }
    const flatElements = [element].flat();
    for (const e of flatElements) {
      e.setAttribute(name, value);
    }
  };

  StdDecls.GetAttr = function(element, name) {
    if (typeof element === 'string') {
      element = Array.from(document.querySelectorAll(element));
    }
    if (Array.isArray(element)) {
      return element[0].getAttribute(name);
    }
    return element.getAttribute(name);
  };

  StdDecls.SetProp = function(element, name, value) {
    if (typeof element === 'string') {
      element = Array.from(document.querySelectorAll(element));
    }
    const flatElements = [element].flat();
    for (const e of flatElements) {
      e[name] = value;
    }
  };

  StdDecls.GetProp = function(element, name) {
    if (typeof element === 'string') {
      element = Array.from(document.querySelectorAll(element));
    }
    if (Array.isArray(element)) {
      return element[0][name];
    }
    return element[name];
  };

  StdDecls.SetHtml = function(element, html) {
    if (typeof element === 'string') {
      element = Array.from(document.querySelectorAll(element));
    }
    const flatElements = [element].flat();
    for (const e of flatElements) {
      e.innerHTML = html;
    }
  };

  StdDecls.GetHtml = function(element) {
    if (typeof element === 'string') {
      element = Array.from(document.querySelectorAll(element));
    }
    if (Array.isArray(element)) {
      return element[0].innerHTML;
    }
    return element.innerHTML;
  };

  StdDecls.SetText = function(element, text) {
    if (typeof element === 'string') {
      element = Array.from(document.querySelectorAll(element));
    }
    const flatElements = [element].flat();
    for (const e of flatElements) {
      e.textContent = text;
    }
  };

  StdDecls.GetText = function(element) {
    if (typeof element === 'string') {
      element = Array.from(document.querySelectorAll(element));
    }
    if (Array.isArray(element)) {
      return element[0].textContent;
    }
    return element.textContent;
  };

  StdDecls.Siblings = function(element) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    return [...element.parentNode.children].filter(e => e !== element);
  };

  StdDecls.HasClass = function(element, classes) {
    if (typeof element === 'string') {
      element = Array.from(document.querySelectorAll(element));
    }
    if (Array.isArray(element)) {
      return element[0].classList.contains(classes);
    }
    return element.classList.contains(classes);
  };

  StdDecls.AddClass = function(element, classes) {
    if (typeof element === 'string') {
      element = Array.from(document.querySelectorAll(element));
    }
    const flatElements = [element].flat();
    for (const e of flatElements) {
      e.classList.add(...classes);
    }
  };

  StdDecls.RemoveClass = function(element, classes) {
    if (typeof element === 'string') {
      element = Array.from(document.querySelectorAll(element));
    }
    const flatElements = [element].flat();
    for (const e of flatElements) {
      e.classList.remove(...classes);
    }
  };

  StdDecls.ToggleClass = function(element, classes) {
    if (typeof element === 'string') {
      element = Array.from(document.querySelectorAll(element));
    }
    const flatElements = [element].flat();
    for (const e of flatElements) {
      e.classList.toggle(classes);
    }
  };

  StdDecls.On = function(element, eventName, callback) {
    if (typeof element === 'string') {
      element = Array.from(document.querySelectorAll(element));
    }
    const flatElements = [element].flat();
    for (const e of flatElements) {
      e.addEventListener(eventName, callback);
    }
  };

  StdDecls.OnClick = function(element, callback) {
    if (typeof element === 'string') {
      element = Array.from(document.querySelectorAll(element));
    }
    const flatElements = [element].flat();
    for (const e of flatElements) {
      e.addEventListener('click', callback);
    }
  };

  StdDecls.Delegate = function(element, selector, eventName, callback) {
    if (typeof element === 'string') {
      element = Array.from(document.querySelectorAll(element));
    }
    const flatElements = [element].flat();
    for (const e of flatElements) {
      e.addEventListener(eventName, event => {
        if (event.target.closest(selector)) {
          callback.call(event.target, event);
        }
      });
    }
  };

  class Walker {
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
      // KEEP
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
        this.#prevTargetExpr = {type: undefined, value: undefined};
        this.#nextTargetExpr = {type: undefined, value: undefined};

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

  function interpretScripts() {
    const scripts = document.querySelectorAll('script[type="text/basescript"]');

    const scanner = new Scanner();
    const parser = new Parser();

    for (const script of scripts) {
      const tokens = scanner.tokenize(script.textContent);

      parser.reset(tokens);
      const { ast } = parser.parse('EOF');

      const walker = new Walker(ast);
      walker.walk();
      walker.addStdFunctions();

      const newScript = document.createElement('script');
      newScript.type = 'text/javascript';
      newScript.textContent = walker.getSource();

      document.body.append(newScript);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      interpretScripts();
    });
  } else {
    interpretScripts();
  }
})();
