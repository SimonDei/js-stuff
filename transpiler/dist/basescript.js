(() => {
  // tokenizer.js
  var Scanner = class _Scanner {
    static #KEYWORDS = [
      "nothing",
      "null",
      "nil",
      "string",
      "integer",
      "real",
      "boolean",
      "object",
      "globals",
      "endglobals",
      "function",
      "endfunction",
      "await",
      "takes",
      "returns",
      "do",
      "enddo",
      "end",
      "local",
      "constant",
      "new",
      "set",
      "return",
      "if",
      "then",
      "else",
      "elseif",
      "endif",
      "is",
      "not",
      "and",
      "or",
      "loop",
      "exitwhen",
      "endloop",
      "for",
      "to",
      "in",
      "struct",
      "call",
      "debug",
      "condition",
      "expect"
    ];
    /** @type {Token[]} */
    #tokens = [];
    #isNumber(str) {
      return /^\d+$/.test(str);
    }
    #isAlphaNumeric(str) {
      return /^[A-Za-z0-9_$#]+$/.test(str);
    }
    #isKeyword(str) {
      return _Scanner.#KEYWORDS.includes(str.toLowerCase());
    }
    #isOperator(str) {
      return /^[!+*\/\-=.,:<>\[\]]+$/.test(str);
    }
    /**
     * @param {string} str
     * @returns {Token[]}
     */
    tokenize(str) {
      let token = "";
      for (let index = 0; index < str.length; index++) {
        token += str[index];
        if (token === ";") {
          token = "";
          continue;
        }
        if (token === "\n" || token === "\r\n") {
          this.#tokens.push({ type: "EOL" });
          token = "";
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
          this.#tokens.push({ type: "STRING", value: strValue });
          token = "";
          continue;
        }
        if (token === "'") {
          let strValue = "'";
          index++;
          while (str[index] !== "'") {
            strValue += str[index];
            index++;
          }
          strValue += str[index];
          this.#tokens.push({ type: "STRING", value: strValue });
          token = "";
          continue;
        }
        if (this.#isNumber(token) && !this.#isNumber(peek)) {
          this.#tokens.push({ type: "NUMBER", value: token });
          token = "";
          continue;
        }
        if (token === "(" || token === ")") {
          token === "(" ? this.#tokens.push({ type: "LPAREN" }) : this.#tokens.push({ type: "RPAREN" });
          token = "";
          continue;
        }
        if (token === "{" || token === "}") {
          token === "{" ? this.#tokens.push({ type: "LBRACE" }) : this.#tokens.push({ type: "RBRACE" });
          token = "";
          continue;
        }
        if (this.#isAlphaNumeric(token) && !this.#isAlphaNumeric(peek)) {
          if (this.#isKeyword(token)) {
            this.#tokens.push({ type: "KEYWORD", value: token });
          } else {
            this.#tokens.push({ type: "IDENTIFIER", value: token });
          }
          token = "";
          continue;
        }
        if (token === "[" || token === "]") {
          this.#tokens.push({ type: "OPERATOR", value: token });
          token = "";
          continue;
        }
        if (this.#isOperator(token) && !this.#isOperator(peek)) {
          this.#tokens.push({ type: "OPERATOR", value: token });
          token = "";
        }
      }
      this.#tokens.push({ type: "EOF" });
      return this.#tokens;
    }
  };

  // parser.js
  var Parser = class _Parser {
    static #NATIVE_TYPES = {
      "nothing": "void",
      "real": "number",
      "integer": "number",
      "string": "string",
      "boolean": "boolean"
    };
    /** @type {import('./tokenizer').Token[]} */
    #tokens = [];
    #index = 0;
    #expr = [];
    /** @type {any[] | (any & { body: any[], parent: any[] })} */
    #targetExpr = [];
    #typesEnabled = false;
    #parentExprType = "";
    #currentFunction = void 0;
    #nestedCallExpr = false;
    #nestedCallNameExpr = false;
    #attempt = 5;
    /**
     * @param {import('./tokenizer').Token[]} tokens 
     */
    constructor(tokens, types = false) {
      this.#tokens = tokens;
      this.#targetExpr = this.#expr;
      this.#typesEnabled = types;
    }
    reset(tokens) {
      this.#tokens = tokens;
      this.#targetExpr = [];
    }
    setTypesEnabled(types) {
      this.#typesEnabled = types;
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
    #pushDecl(decl, propName) {
      if (Array.isArray(this.#targetExpr)) {
        this.#targetExpr.push(decl);
      } else if (propName) {
        this.#targetExpr[propName].push(decl);
      } else {
        this.#targetExpr.body.push(decl);
      }
    }
    // ===========================================================================
    // ===========================================================================
    #globalsDeclaration() {
      const globalDeclaration = {
        type: "GlobalsDeclaration",
        body: [],
        parent: this.#targetExpr
      };
      this.#advance();
      this.#targetExpr = globalDeclaration;
      this.parse("KEYWORD", "end");
      this.#targetExpr = globalDeclaration.parent;
      this.#advance();
      this.#pushDecl(globalDeclaration);
    }
    // ===========================================================================
    // ===========================================================================
    #variableDeclaration() {
      const variableDecl = {
        type: "VariableDeclaration",
        varType: void 0,
        name: "",
        body: [],
        parent: this.#targetExpr
      };
      this.#advance();
      if (this.#typesEnabled) {
        variableDecl.varType = this.#currentValue;
        this.#advance();
      }
      variableDecl.name = this.#currentValue;
      if (this.#peek().type === "OPERATOR" && this.#peek().value?.toLowerCase() === "=") {
        this.#advance(2);
        this.#targetExpr = variableDecl;
        this.parse("EOL");
        this.#targetExpr = variableDecl.parent;
      }
      this.#advance();
      this.#pushDecl(variableDecl);
    }
    // ===========================================================================
    // ===========================================================================
    #constantDeclaration() {
      const constantDecl = {
        type: "ConstantDeclaration",
        name: "",
        varType: "",
        body: [],
        parent: this.#targetExpr
      };
      this.#advance();
      constantDecl.name = this.#currentValue;
      if (this.#peek().type === "OPERATOR" && this.#peek().value?.toLowerCase() === "=") {
        this.#advance(2);
        this.#targetExpr = constantDecl;
        this.parse("EOL");
        this.#targetExpr = constantDecl.parent;
      }
      this.#advance();
      this.#pushDecl(constantDecl);
    }
    // ===========================================================================
    // ===========================================================================
    #functionDeclaration() {
      const functionDecl = {
        type: "FunctionDeclaration",
        name: "",
        body: [],
        parameters: [],
        // returns: undefined,
        async: false,
        parent: this.#targetExpr
      };
      this.#currentFunction = functionDecl;
      this.#advance();
      if (this.#currentType === "LPAREN") {
        this.#advance();
      } else if (this.#currentType === "IDENTIFIER" && this.#peekType === "LPAREN") {
        functionDecl.name = this.#currentValue;
        this.#advance(2);
      } else {
        this.#functionReference();
        return;
      }
      functionDecl.parameters = this.#functionParameterDeclaration();
      this.#targetExpr = functionDecl;
      this.parse("KEYWORD", "end");
      this.#advance();
      this.#targetExpr = functionDecl.parent;
      this.#pushDecl(functionDecl);
      this.#currentFunction = void 0;
    }
    #functionParameterDeclaration() {
      const parameters = [];
      while (true) {
        if (this.#currentType === "RPAREN") {
          this.#advance();
          break;
        }
        if (this.#currentType === "OPERATOR" && this.#currentValue === ",") {
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
        type: "DoExpression",
        async: false,
        body: [],
        parent: this.#targetExpr
      };
      const prevCurrentFunction = this.#currentFunction;
      this.#currentFunction = doExpression;
      this.#advance();
      this.#targetExpr = doExpression;
      this.parse("KEYWORD", "end");
      this.#advance();
      this.#targetExpr = doExpression.parent;
      this.#pushDecl(doExpression);
      this.#currentFunction = prevCurrentFunction;
    }
    // ===========================================================================
    // ===========================================================================
    #setExpression() {
      const setExpression = {
        type: "SetExpression",
        left: [],
        right: [],
        parent: this.#targetExpr
      };
      this.#parentExprType = setExpression.type;
      this.#advance();
      this.#targetExpr = setExpression.left;
      this.parse("OPERATOR", "=");
      this.#advance();
      this.#targetExpr = setExpression.right;
      this.parse("EOL");
      this.#targetExpr = setExpression.parent;
      this.#pushDecl(setExpression);
    }
    // ===========================================================================
    // ===========================================================================
    #returnExpression() {
      const returnExpression = {
        type: "ReturnExpression",
        body: [],
        parent: this.#targetExpr
      };
      this.#advance();
      this.#targetExpr = returnExpression.body;
      this.parse("EOL");
      this.#targetExpr = returnExpression.parent;
      this.#advance();
      this.#pushDecl(returnExpression);
    }
    // ===========================================================================
    // ===========================================================================
    #ifStatement() {
      const ifStatement = {
        type: "IfStatement",
        testLeft: [],
        testRight: [],
        operator: "",
        then: [],
        else: void 0,
        parent: this.#targetExpr
      };
      this.#advance();
      this.#targetExpr = ifStatement.testLeft;
      this.parse("OPERATOR", [">", "<", ">=", "<=", "==", "!="]);
      this.#targetExpr = ifStatement.parent;
      ifStatement.operator = this.#currentValue;
      this.#advance();
      this.#targetExpr = ifStatement.testRight;
      this.parse("KEYWORD", "then");
      this.#targetExpr = ifStatement.parent;
      this.#advance();
      this.#targetExpr = ifStatement.then;
      const { endValue } = this.parse("KEYWORD", ["end", "else"]);
      if (endValue === "else") {
        this.#advance();
        ifStatement.else = [];
        this.#targetExpr = ifStatement.else;
        this.parse("KEYWORD", "end");
      }
      this.#advance();
      this.#targetExpr = ifStatement.parent;
      this.#pushDecl(ifStatement);
    }
    // ===========================================================================
    // ===========================================================================
    #callExpression(nested = false) {
      const callExpression = {
        type: "CallExpression",
        name: [],
        async: false,
        body: [],
        parent: this.#targetExpr
      };
      if (!nested || !this.#nestedCallExpr) {
        this.#advance();
      }
      if (this.#currentType === "KEYWORD" && this.#currentValue.toLowerCase() === "await") {
        callExpression.async = true;
        if (this.#currentFunction) {
          this.#currentFunction.async = true;
        }
        this.#advance();
      }
      this.#targetExpr = callExpression.name;
      this.#nestedCallNameExpr = true;
      this.parse("LPAREN");
      this.#nestedCallNameExpr = false;
      this.#targetExpr = callExpression.parent;
      this.#advance();
      this.#targetExpr = callExpression;
      const prevNestedCallExpr = this.#nestedCallExpr;
      this.#nestedCallExpr = true;
      this.parse("RPAREN");
      this.#nestedCallExpr = prevNestedCallExpr;
      this.#targetExpr = callExpression.parent;
      this.#advance();
      this.#pushDecl(callExpression);
    }
    #structDefinition() {
      const structDefinition = {
        type: "StructDefinition",
        name: "",
        body: [],
        parent: this.#targetExpr
      };
      this.#advance();
      structDefinition.name = this.#currentValue;
      this.#advance();
      const prevTargetExpr = this.#targetExpr;
      this.#targetExpr = structDefinition.body;
      this.parse("KEYWORD", "end");
      this.#targetExpr = prevTargetExpr;
      this.#advance();
      this.#pushDecl(structDefinition);
    }
    #memberExpression() {
      const memberExpression = {
        type: "MemberExpression",
        left: "",
        right: [],
        parent: this.#targetExpr
      };
      memberExpression.left = this.#currentValue;
      this.#advance(2);
      const prevTargetExpr = this.#targetExpr;
      this.#targetExpr = memberExpression.right;
      this.parse(["EOL", "KEYWORD", "RPAREN", "OPERATOR"], [void 0, "then", void 0, "+", "-", "*", "/", ">", "<", ">=", "<=", "==", "!="]);
      this.#targetExpr = prevTargetExpr;
      this.#pushDecl(memberExpression);
    }
    // ===========================================================================
    // ===========================================================================
    #arrayAccessExpression() {
      const arrayAccessExpression = {
        type: "ArrayAccessExpression",
        name: "",
        body: [],
        parent: this.#targetExpr
      };
      arrayAccessExpression.name = this.#currentValue;
      this.#advance(2);
      const prevTargetExpr = this.#targetExpr;
      this.#targetExpr = arrayAccessExpression.body;
      this.parse("OPERATOR", "]");
      this.#targetExpr = prevTargetExpr;
      this.#advance();
      this.#pushDecl(arrayAccessExpression);
    }
    // ===========================================================================
    // ===========================================================================
    #staticValue() {
      const staticValue = {
        type: "StaticValue",
        name: ""
      };
      staticValue.name = this.#currentValue;
      return staticValue;
    }
    // ===========================================================================
    // ===========================================================================
    #functionReference() {
      const functionReference = {
        type: "FunctionReference",
        name: ""
      };
      functionReference.name = this.#currentValue;
      this.#advance();
      this.#pushDecl(functionReference);
    }
    // ===========================================================================
    // ===========================================================================
    #loopStatement() {
      const loopStatement = {
        type: "LoopStatement",
        exitwhen: void 0,
        body: [],
        parent: this.#targetExpr
      };
      this.#advance();
      this.#targetExpr = loopStatement;
      this.parse("KEYWORD", "end");
      this.#advance();
      this.#targetExpr = loopStatement.parent;
      this.#pushDecl(loopStatement);
    }
    #forStatement() {
      const forStatement = {
        type: "ForStatement",
        indexVar: "",
        from: [],
        to: [],
        body: [],
        parent: this.#targetExpr
      };
      this.#advance();
      forStatement.indexVar = this.#currentValue;
      this.#advance();
      let prevTargetExpr = this.#targetExpr;
      if (this.#currentType !== "OPERATOR" || this.#currentValue !== ",") {
        this.#advance();
        this.#targetExpr = forStatement.from;
        this.parse(["KEYWORD", "OPERATOR"], ["to", ","]);
        this.#targetExpr = prevTargetExpr;
      }
      this.#advance();
      prevTargetExpr = this.#targetExpr;
      this.#targetExpr = forStatement.to;
      this.parse("EOL");
      this.#targetExpr = prevTargetExpr;
      this.#advance();
      prevTargetExpr = this.#targetExpr;
      this.#targetExpr = forStatement.body;
      this.parse("KEYWORD", "end");
      this.#targetExpr = prevTargetExpr;
      this.#advance();
      this.#pushDecl(forStatement);
    }
    // ===========================================================================
    // ===========================================================================
    #exitwhenExpression() {
      const exitwhenExpression = {
        type: "ExitwhenExpression",
        body: [],
        parent: this.#targetExpr
      };
      this.#advance();
      this.#targetExpr = exitwhenExpression;
      this.parse("EOL");
      this.#targetExpr = exitwhenExpression.parent;
      this.#targetExpr.exitwhen = exitwhenExpression;
    }
    // ===========================================================================
    // ===========================================================================
    #assignmentExpression() {
      const assignmentExpression = {
        type: "AssignmentExpression",
        left: "",
        right: [],
        parent: this.#targetExpr
      };
      assignmentExpression.left = this.#currentValue;
      this.#advance(2);
      const prevTargetExpr = this.#targetExpr;
      this.#targetExpr = assignmentExpression.right;
      this.parse(["RBRACE", "OPERATOR", "EOL"], [void 0, ",", void 0]);
      this.#targetExpr = prevTargetExpr;
      if (this.#currentType === "OPERATOR" && this.#currentValue === ",") {
        this.#advance();
      }
      this.#pushDecl(assignmentExpression);
    }
    // ===========================================================================
    // ===========================================================================
    #conditionExpression() {
      const conditionExpression = {
        type: "ConditionExpression",
        body: [],
        parent: this.#targetExpr
      };
      this.#advance();
      const prevTargetExpr = this.#targetExpr;
      this.#targetExpr = conditionExpression.body;
      this.parse("EOL");
      this.#targetExpr = prevTargetExpr;
      this.#pushDecl(conditionExpression);
    }
    // ===========================================================================
    // ===========================================================================
    #object() {
      const objectDeclaration = {
        type: "ObjectDeclaration",
        body: []
      };
      this.#advance();
      const prevTargetExpr = this.#targetExpr;
      this.#targetExpr = objectDeclaration;
      this.parse("RBRACE");
      this.#targetExpr = prevTargetExpr;
      this.#advance();
      this.#pushDecl(objectDeclaration);
    }
    #number() {
      const number = {
        type: "Number",
        value: ""
      };
      number.value = this.#currentValue;
      this.#advance();
      this.#pushDecl(number);
    }
    #operator() {
      if (this.#currentValue === "//") {
        const comment = {
          type: "Comment",
          body: []
        };
        this.#advance();
        const prevTargetExpr = this.#targetExpr;
        this.#targetExpr = comment;
        this.parse("EOL");
        this.#targetExpr = prevTargetExpr;
        this.#pushDecl(comment);
        return;
      }
      const operator = {
        type: "Operator",
        value: ""
      };
      operator.value = this.#currentValue;
      this.#advance();
      this.#pushDecl(operator);
    }
    #identifier() {
      const identifier = {
        type: "Identifier",
        value: "",
        parent: this.#targetExpr
      };
      if (this.#peekType === "LPAREN" && !this.#nestedCallNameExpr) {
        this.#nestedCallExpr = true;
        this.#callExpression(true);
        this.#nestedCallExpr = false;
        return;
      }
      if (this.#peekType === "OPERATOR" && (this.#peekValue === "." || this.#peekValue === "->")) {
        this.#memberExpression();
        return;
      }
      if (this.#peekType === "OPERATOR" && this.#peekValue === "[") {
        this.#arrayAccessExpression();
        return;
      }
      if (this.#parentExprType !== "SetExpression" && this.#peekType === "OPERATOR" && this.#peekValue === "=") {
        this.#assignmentExpression();
        return;
      }
      identifier.value = this.#currentValue;
      this.#advance();
      this.#pushDecl(identifier);
    }
    #nilExpression() {
      const nilExpression = {
        type: "NilExpression",
        parent: this.#targetExpr
      };
      this.#advance();
      this.#pushDecl(nilExpression);
    }
    #string() {
      const string = {
        type: "String",
        value: ""
      };
      string.value = this.#currentValue;
      this.#advance();
      this.#pushDecl(string);
    }
    // ===========================================================================
    // ===========================================================================
    #debugExpression() {
      const debugExpression = {
        type: "DebugExpression"
      };
      this.#advance();
      this.#pushDecl(debugExpression);
    }
    // ===========================================================================
    // ===========================================================================
    #keyword() {
      if (Object.keys(_Parser.#NATIVE_TYPES).includes(this.#currentValue.toLowerCase()) && this.#targetExpr.type === "GlobalsDeclaration") {
        this.#variableDeclaration();
        return;
      }
      switch (this.#currentValue.toLowerCase()) {
        case "globals":
          this.#globalsDeclaration();
          break;
        case "function":
          this.#functionDeclaration();
          break;
        case "do":
          this.#doExpression();
          break;
        case "local":
          this.#variableDeclaration();
          break;
        case "constant":
          this.#constantDeclaration();
          break;
        case "set":
          this.#setExpression();
          break;
        case "return":
          this.#returnExpression();
          break;
        case "if":
          this.#ifStatement();
          break;
        case "call":
          this.#callExpression();
          break;
        case "loop":
          this.#loopStatement();
          break;
        case "exitwhen":
          this.#exitwhenExpression();
          break;
        case "debug":
          this.#debugExpression();
          break;
        case "for":
          this.#forStatement();
          break;
        case "nil":
          this.#nilExpression();
          break;
        case "condition":
        case "expect":
          this.#conditionExpression();
          break;
        case "struct":
          this.#structDefinition();
          break;
        case "is":
        case "not":
        case "new":
        case "null":
        case "and":
        case "or":
          this.#operator();
          break;
      }
    }
    parse(endType = "EOF", endValue = void 0, skipEol = true) {
      if (!Array.isArray(endType)) {
        endType = [endType];
      }
      while (!endType.includes(this.#currentType) || (Array.isArray(endValue) ? !endValue.includes(this.#currentValue?.toLocaleLowerCase()) : this.#currentValue?.toLowerCase() !== endValue)) {
        if (this.#attempt <= 0) {
          return;
        }
        if (skipEol && this.#currentType === "EOL") {
          this.#advance();
          continue;
        }
        switch (this.#currentType) {
          case "KEYWORD":
            this.#keyword();
            break;
          case "LBRACE":
            this.#object();
            break;
          case "NUMBER":
            this.#number();
            break;
          case "OPERATOR":
            this.#operator();
            break;
          case "IDENTIFIER":
            this.#identifier();
            break;
          case "STRING":
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
  };

  // stdfunctions.js
  var StdDecls = {};
  StdDecls.assert = function(test, message) {
    if (!test) {
      throw new Error(message);
    }
  };
  StdDecls.typeof = function(value) {
    return Object.prototype.toString.call(value);
  };
  StdDecls.tointeger = function(value) {
    return Number.parseInt(value);
  };
  StdDecls.tofloat = function(value) {
    return Number.parseFloat(value);
  };
  StdDecls.tostring = function(value) {
    return value?.toString() ?? "";
  };
  StdDecls.toboolean = function(value) {
    return Boolean(value);
  };
  StdDecls.I2S = function(value) {
    return value.toString();
  };
  StdDecls.S2I = function(value) {
    return Number.parseInt(value);
  };
  StdDecls.print = function(message) {
  };
  StdDecls.log = function(value) {
  };
  StdDecls.info = function(value) {
  };
  StdDecls.length = function(value) {
    return value?.length ?? 0;
  };
  StdDecls.at = function(array, index) {
    return array[index];
  };
  StdDecls.pairs = function(object) {
    return Object.entries(object);
  };
  StdDecls.upper = function(value) {
    return value.toUpperCase();
  };
  StdDecls.lower = function(value) {
    return value.toLowerCase();
  };
  StdDecls.substr = function(value, start, end) {
    return value.substring(start, end);
  };
  StdDecls.char = function(value) {
    return value.charCodeAt(0);
  };
  StdDecls.add = function(a, b) {
    return a + b;
  };
  StdDecls.sub = function(a, b) {
    return a - b;
  };
  StdDecls.mul = function(a, b) {
    return a * b;
  };
  StdDecls.div = function(a, b) {
    return a / b;
  };
  StdDecls.pow = function(a, b) {
    return Math.pow(a, b);
  };
  StdDecls.floor = function(value) {
    return Math.floor(value);
  };
  StdDecls.round = function(value) {
    return Math.round(value);
  };
  StdDecls.rand = function(min = 0, max = 1) {
    return Math.random() * max + min;
  };
  StdDecls.randInt = function(min = 0, max = 1) {
    return Math.floor(Math.random() * max) + min;
  };
  StdDecls.array = function(...values) {
    return [...values];
  };
  StdDecls.each = function(array, func) {
    for (const item of array) {
      func(item);
    }
  };
  StdDecls.foreach = function(array, func) {
    for (const item of array) {
      func(item);
    }
  };
  StdDecls.find = function(needle, haystack) {
    return haystack.find((e) => e === needle);
  };
  StdDecls.compact = function(array) {
    return array.filter(Boolean);
  };
  StdDecls.concat = function(array1, array2) {
    return [...array1, ...array2];
  };
  StdDecls.writeClipboard = async function(message) {
    return window.clipboard.writeText(message);
  };
  StdDecls.readClipboard = async function() {
    return window.clipboard.readText();
  };
  StdDecls.fetch = async function(url) {
    return fetch(url);
  };
  StdDecls.fetchJson = async function(url) {
    return fetch(url).then((resp) => resp.json());
  };
  StdDecls.fetchText = async function(url) {
    return fetch(url).then((resp) => resp.text());
  };
  var stdfunctions_default = StdDecls;

  // walker.js
  var Walker = class _Walker {
    static #STDFUNCTIONS = Object.keys(stdfunctions_default);
    static #NATIVE_TYPES = {
      "nothing": "void",
      "real": "number",
      "integer": "number",
      "string": "string",
      "boolean": "boolean",
      "element": "HTMLElement"
    };
    static #NATIVE_OPERATORS = {
      ".": ".",
      "->": ".",
      "==": "===",
      "!=": "!==",
      "is": "===",
      "not": "!==",
      "and": "&&",
      "or": "||",
      "less": "<",
      "greater": ">"
    };
    #ast = [];
    #prevTargetExpr = {};
    #nextTargetExpr = {};
    #parentTargetExpr = [];
    #targetExpr = [];
    #typesEnabled = false;
    #depth = 1;
    #separator = "";
    #allowSpaces = true;
    #allowSemi = true;
    #walkIndex = 0;
    #walkLength = 0;
    #foundStdFunctions = [];
    #nestedCallStack = 0;
    #isInObject = false;
    #isInMemberExpression = false;
    #isInAssignmentExpression = false;
    #source = "";
    constructor(ast, types = false) {
      this.#ast = ast;
      this.#targetExpr = this.#ast;
      this.#typesEnabled = types;
    }
    #addSpaces() {
      for (let i = 0; i < this.#depth; i++) {
        this.#source += "  ";
      }
    }
    #addJsDocType(declType) {
      let typeValue = "";
      if (Object.keys(_Walker.#NATIVE_TYPES).includes(declType)) {
        typeValue = _Walker.#NATIVE_TYPES[declType];
      } else {
        typeValue = declType;
      }
      return `/** @type {${typeValue}} */`;
    }
    #addJsDocReturnType(returnType) {
      let typeValue = "";
      if (Object.keys(_Walker.#NATIVE_TYPES).includes(returnType)) {
        typeValue = _Walker.#NATIVE_TYPES[returnType];
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
      this.#source += "\n";
    }
    functionDeclaration() {
      if (this.#allowSpaces) {
        this.#addSpaces();
      }
      if (this.#targetExpr.async) {
        this.#source += "async ";
      }
      this.#source += "function";
      if (this.#targetExpr.name) {
        this.#source += ` ${this.#targetExpr.name}`;
      }
      this.#source += "(";
      this.#targetExpr.parameters.forEach((e, i, arr) => {
        if (i < arr.length - 1) {
          this.#source += `${e}, `;
          return;
        }
        this.#source += e;
      });
      this.#source += ") {\n";
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
      this.#source += `}${this.#nestedCallStack > 0 ? "" : "\n"}`;
    }
    variableDeclaration() {
      this.#addSpaces();
      this.#source += `let ${this.#targetExpr.name} = `;
      const prevTargetExpr = this.#targetExpr;
      this.#targetExpr = this.#targetExpr.body;
      this.#separator = " ";
      this.#allowSpaces = false;
      this.#allowSemi = false;
      this.walk();
      this.#separator = "";
      this.#allowSpaces = true;
      this.#allowSemi = true;
      this.#targetExpr = prevTargetExpr;
      this.#source += ";\n";
    }
    constantDeclaration() {
      this.#addSpaces();
      this.#source += `const ${this.#targetExpr.name} = `;
      const prevTargetExpr = this.#targetExpr;
      this.#targetExpr = this.#targetExpr.body;
      this.#separator = " ";
      this.#allowSpaces = false;
      this.#allowSemi = false;
      this.walk();
      this.#separator = "";
      this.#allowSpaces = true;
      this.#allowSemi = true;
      this.#targetExpr = prevTargetExpr;
      this.#source += ";\n";
    }
    ifStatement() {
      this.#addSpaces();
      this.#source += "if (";
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
      this.#source += ") {\n";
      this.#targetExpr = this.#targetExpr.then;
      this.#depth++;
      this.walk();
      this.#depth--;
      this.#targetExpr = prevTargetExpr;
      if (this.#targetExpr.else) {
        this.#addSpaces();
        this.#source += "} else {\n";
        prevTargetExpr = this.#targetExpr;
        this.#targetExpr = this.#targetExpr.else;
        this.#depth++;
        this.walk();
        this.#depth--;
        this.#targetExpr = prevTargetExpr;
      }
      this.#addSpaces();
      this.#source += "}\n";
    }
    setExpression() {
      this.#addSpaces();
      let prevTargetExpr = this.#targetExpr;
      this.#targetExpr = this.#targetExpr.left;
      this.#allowSpaces = false;
      this.#allowSemi = false;
      this.walk();
      this.#allowSpaces = true;
      this.#allowSemi = true;
      this.#targetExpr = prevTargetExpr;
      this.#source += " = ";
      prevTargetExpr = this.#targetExpr;
      this.#targetExpr = this.#targetExpr.right;
      this.#separator = " ";
      this.#allowSpaces = false;
      this.#allowSemi = false;
      this.walk();
      this.#separator = "";
      this.#allowSpaces = true;
      this.#allowSemi = true;
      this.#targetExpr = prevTargetExpr;
      this.#source += ";\n";
    }
    callExpression() {
      if (this.#allowSpaces) {
        this.#addSpaces();
      }
      const simpleCallName = this.#targetExpr.name.reduce((acc, val) => acc + val?.value, "");
      if (_Walker.#STDFUNCTIONS.includes(simpleCallName)) {
        this.#foundStdFunctions.push(simpleCallName);
        this.#targetExpr.name = [{ type: "Identifier", value: `__${simpleCallName}`, parent: this.#targetExpr }];
      }
      if (this.#targetExpr.async) {
        this.#source += "await ";
      }
      let prevTargetExpr = this.#targetExpr;
      this.#targetExpr = this.#targetExpr.name;
      this.walk();
      this.#targetExpr = prevTargetExpr;
      this.#source += "(";
      this.#targetExpr = this.#targetExpr.body;
      const prevAllowSpaces = this.#allowSpaces;
      const prevAllowSemi = this.#allowSemi;
      this.#separator = ", ";
      this.#allowSpaces = false;
      this.#allowSemi = false;
      this.#nestedCallStack++;
      this.walk();
      this.#targetExpr = prevTargetExpr;
      this.#separator = "";
      this.#allowSpaces = prevAllowSpaces;
      this.#allowSemi = prevAllowSemi;
      this.#nestedCallStack--;
      this.#source += `)`;
      if (this.#nextTargetExpr?.type === "Operator" && this.#nextTargetExpr?.value === ".") {
        return;
      }
      if (this.#allowSemi && this.#nestedCallStack === 0) {
        this.#source += ";\n";
      }
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
        this.#source += ";\n";
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
      this.#source += "]";
      if (this.#allowSemi) {
        this.#source += ";\n";
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
      this.#source += ")) {\n";
      this.#depth++;
      this.#addSpaces();
      this.#depth--;
      this.#source += "return;\n";
      this.#addSpaces();
      this.#source += "}\n";
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
      this.#source += "while (!(";
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
      this.#source += ")) {\n";
      prevTargetExpr = this.#targetExpr;
      this.#targetExpr = this.#targetExpr.body;
      this.#depth++;
      this.walk();
      this.#depth--;
      this.#targetExpr = prevTargetExpr;
      this.#addSpaces();
      this.#source += "}\n";
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
      this.#source += `; ${this.#targetExpr.indexVar}++) {
`;
      prevTargetExpr = this.#targetExpr;
      this.#targetExpr = this.#targetExpr.body;
      this.#depth++;
      this.walk();
      this.#depth--;
      this.#targetExpr = prevTargetExpr;
      if (this.#allowSpaces) {
        this.#addSpaces();
      }
      this.#source += "}\n";
    }
    doExpression() {
      if (this.#allowSpaces) {
        this.#addSpaces();
      }
      this.#source += "(";
      if (this.#targetExpr.async) {
        this.#source += "async ";
      }
      this.#source += "function() {\n";
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
      this.#source += "return ";
      const prevTargetExpr = this.#targetExpr;
      const prevAllowSpaces = this.#allowSpaces;
      const prevAllowSemi = this.#allowSemi;
      this.#targetExpr = this.#targetExpr.body;
      this.#allowSpaces = false;
      this.#allowSemi = false;
      this.walk();
      this.#targetExpr = prevTargetExpr;
      this.#allowSpaces = prevAllowSpaces;
      this.#allowSemi = prevAllowSemi;
      this.#source += ";\n";
    }
    nilExpression() {
      if (["is", "not", "===", "!=="].includes(this.#prevTargetExpr.value)) {
        this.#source = this.#source.slice(0, -2);
      }
      this.#source += " null";
    }
    structDefinition() {
      if (this.#allowSpaces) {
        this.#addSpaces();
      }
      this.#source += `const ${this.#targetExpr.name} = {
`;
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
      this.#source += "};\n";
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
        this.#source += ";\n";
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
      this.#source += ",\n";
    }
    objectDeclaration() {
      if (this.#allowSpaces) {
        this.#addSpaces();
      }
      this.#source += `{`;
      const prevTargetExpr = this.#targetExpr;
      const prevIsInObject = this.#isInObject;
      this.#targetExpr = this.#targetExpr.body;
      this.#isInObject = true;
      this.#depth++;
      this.walk();
      this.#targetExpr = prevTargetExpr;
      this.#isInObject = prevIsInObject;
      this.#depth--;
      this.#source += "}";
    }
    number() {
      this.#source += this.#targetExpr.value;
      if (this.#nestedCallStack <= 0 && this.#separator && this.#walkIndex < this.#walkLength - 1) {
        this.#source += " ";
      }
    }
    string() {
      this.#source += this.#targetExpr.value;
      if (this.#walkIndex < this.#walkLength - 1) {
        this.#source += " ";
      }
    }
    identifier() {
      if (this.#targetExpr.value.startsWith("#")) {
        this.#source += `${this.#targetExpr.value.slice(1)}.length`;
        if (this.#walkIndex < this.#walkLength - 1 && this.#nextTargetExpr?.value !== "." && this.#allowSpaces) {
          this.#source += " ";
        }
        return;
      }
      if (this.#targetExpr.parent.type === "GlobalsDeclaration") {
        if (this.#allowSpaces) {
          this.#addSpaces();
        }
        this.#source += "const ";
      }
      this.#source += this.#targetExpr.value;
      if (this.#walkIndex < this.#walkLength - 1 && this.#nextTargetExpr?.value !== "." && this.#nextTargetExpr?.value !== "->" && this.#allowSpaces) {
        this.#source += " ";
      }
    }
    operator() {
      if (this.#isInMemberExpression && this.#isInAssignmentExpression && this.#targetExpr.value === ",") {
        return;
      }
      if (Object.keys(_Walker.#NATIVE_OPERATORS).includes(this.#targetExpr.value)) {
        this.#source += _Walker.#NATIVE_OPERATORS[this.#targetExpr.value];
      } else {
        this.#source += this.#targetExpr.value;
      }
      if (this.#walkIndex < this.#walkLength - 1 && this.#allowSpaces || this.#nestedCallStack > 0) {
        this.#source += " ";
      }
    }
    comment() {
      if (this.#allowSpaces) {
        this.#addSpaces();
      }
      this.#source += `// ${this.#targetExpr.body.map((e) => e.value ?? "").join(" ")}
`;
    }
    debugExpression() {
      if (this.#allowSpaces) {
        this.#addSpaces();
      }
      this.#source += "debugger;\n";
    }
    walk() {
      this.#walkLength = this.#targetExpr.length;
      this.#walkIndex = 0;
      this.#parentTargetExpr = this.#targetExpr;
      for (const object of this.#targetExpr) {
        this.#prevTargetExpr = { type: void 0, value: void 0 };
        this.#nextTargetExpr = { type: void 0, value: void 0 };
        this.#prevTargetExpr = this.#parentTargetExpr[this.#walkIndex - 1];
        this.#nextTargetExpr = this.#parentTargetExpr[this.#walkIndex + 1];
        this.#targetExpr = object;
        this[`${object.type.slice(0, 1).toLowerCase()}${object.type.slice(1)}`]();
        this.#walkIndex++;
      }
    }
    addStdFunctions() {
      let stdFunctionSource = "";
      this.#foundStdFunctions = [...new Set(this.#foundStdFunctions)];
      for (const stdFunction of this.#foundStdFunctions) {
        if (stdfunctions_default.hasOwnProperty(stdFunction)) {
          stdFunctionSource += `  const __${stdFunction} = ${stdfunctions_default[stdFunction].toString().replace(/[\r\t\n]/g, "")};
`;
        }
      }
      this.#source = "(function() {\n" + stdFunctionSource + this.#source + "})();\n";
    }
    getSource() {
      return this.#source;
    }
  };

  // browser.js
  function interpretScripts() {
    const scripts = document.querySelectorAll('script[type="text/basescript"]');
    const scanner = new Scanner();
    const parser = new Parser();
    for (const script of scripts) {
      const typesEnabled = Boolean(script.dataset?.types);
      parser.setTypesEnabled(typesEnabled);
      const tokens = scanner.tokenize(script.textContent);
      parser.reset(tokens);
      const { ast } = parser.parse("EOF");
      const walker = new Walker(ast, typesEnabled);
      walker.walk();
      walker.addStdFunctions();
      const newScript = document.createElement("script");
      newScript.type = "text/javascript";
      newScript.textContent = walker.getSource();
      document.body.append(newScript);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      interpretScripts();
    });
  } else {
    interpretScripts();
  }
})();
