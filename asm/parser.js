// import util from 'util';

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
  #parentExprType = '';
  #currentSection = undefined;
  #currentProcedure = undefined;
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
    return this.#tokens[this.#index + 1].value?.toUpperCase();
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

  #variableDeclaration() {
    const decl = {
      type: 'VariableDeclaration',
      varType: '',
      name: '',
      body: [],
      parent: this.#targetExpr
    }
    console.log(decl);

    decl.name = this.#currentValue;

    this.#advance(); // var type

    decl.varType = this.#currentValue;

    this.#advance(); // var value

    console.log(decl);

    this.#targetExpr = decl.body;

    this.parse('EOL');

    this.#targetExpr = decl.parent;

    this.#pushDecl(decl);
  }
  
  // ===========================================================================
  // ===========================================================================

  #dataSection() {
    const decl = {
      type: 'DataSection',
      body: [],
      parent: this.#targetExpr
    };

    this.#currentSection = 'DATA';

    this.#advance();

    this.#targetExpr = decl.body;

    this.parse(['KEYWORD', 'KEYWORD'], ['end', '.code']);

    this.#targetExpr = decl.parent;

    console.log(decl);

    //this.#advance(); // next token

    this.#pushDecl(decl);
  }

  // ===========================================================================
  // ===========================================================================

  #codeSection() {
    const decl = {
      type: 'CodeSection',
      body: [],
      parent: this.#targetExpr
    };

    this.#currentSection = 'CODE';

    this.#advance(); // next token

    this.#targetExpr = decl.body;

    this.parse('KEYWORD', 'end');

    this.#targetExpr = decl.parent;

    this.#advance(); // next token

    this.#pushDecl(decl);
  }

  // ===========================================================================
  // ===========================================================================

  #procedureDefinition() {
    const decl = {
      type: 'ProcedureDefinition',
      name: '',
      body: [],
      parameters: [],
      // returns: undefined,
      // async: false,
      parent: this.#targetExpr
    };

    this.#currentProcedure = decl;

    decl.name = this.#currentValue;

    this.#advance(); // proc Keyword

    this.#advance(); // first param name

    // console.log(this.#currentType, this.#currentValue);

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

    decl.parameters = this.#procedureParameterDeclaration();

    //console.log(this.#currentType, this.#currentValue);

    //this.#advance();

    // functionDecl.returns = this.#currentValue;

    // this.#advance();

    this.#targetExpr = decl;

    this.parse('KEYWORD', 'endp');

    this.#advance();

    this.#targetExpr = decl.parent;

    this.#pushDecl(decl);

    this.#currentProcedure = undefined;
  }

  #procedureParameterDeclaration() {
    const parameters = [];

    while (this.#currentType !== 'EOL') {
      const parameter = { type: '', name: '' };
      
      parameter.name = this.#currentValue;

      this.#advance(); // Colon
      this.#advance(); // Type

      parameter.type = this.#currentValue;

      this.#advance(); // Comma?

      if (this.#currentType === 'OPERATOR' && this.#currentValue === ',') {
        this.#advance();
      }

      parameters.push(parameter);
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

    const prevCurrentFunction = this.#currentProcedure;
    this.#currentProcedure = doExpression;

    this.#advance();

    this.#targetExpr = doExpression;

    this.parse('KEYWORD', 'end');

    this.#advance();

    this.#targetExpr = doExpression.parent;

    this.#pushDecl(doExpression);

    this.#currentProcedure = prevCurrentFunction;
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

    //console.log('set expression');

    this.#parentExprType = setExpression.type;

    this.#advance();

    //console.log(this.#currentType, this.#currentValue);

    this.#targetExpr = setExpression.left;

    this.parse('OPERATOR', '=');

    //console.log(setExpression);
    
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
      testLeft: [],
      testRight: [],
      operator: '',
      then: [],
      else: undefined,
      parent: this.#targetExpr
    };

    this.#advance();

    this.#targetExpr = ifStatement.testLeft;

    this.parse('OPERATOR', ['>', '<', '>=', '<=', '==', '!=']);

    this.#targetExpr = ifStatement.parent;

    ifStatement.operator = this.#currentValue;

    this.#advance();

    //console.log(this.#currentType, this.#currentValue);

    this.#targetExpr = ifStatement.testRight;

    this.parse('EOL');

    this.#targetExpr = ifStatement.parent;

    //console.log(ifStatement);

    /*
    while (this.#peekType !== 'KEYWORD' || this.#peekValue !== 'then') {
      ifStatement.test += this.#currentValue + ' ';
      this.#advance();
    }

    ifStatement.test += this.#currentValue;
     */

    this.#advance();

    this.#targetExpr = ifStatement.then;

    const { endValue } = this.parse('KEYWORD', ['.endif', '.else']);

    if (endValue.toLowerCase() === '.else') {
      this.#advance();

      ifStatement.else = [];
      this.#targetExpr = ifStatement.else;

      this.parse('KEYWORD', '.endif');
    }

    this.#advance();

    this.#targetExpr = ifStatement.parent;

    this.#pushDecl(ifStatement);
  }

  #structDefinition() {
    const structDefinition = {
      type: 'StructDefinition',
      name: '',
      body: [],
      parent: this.#targetExpr
    };

    this.#advance();

    structDefinition.name = this.#currentValue;

    this.#advance();

    const prevTargetExpr = this.#targetExpr;

    this.#targetExpr = structDefinition.body;

    this.parse('KEYWORD', 'end');

    this.#targetExpr = prevTargetExpr;

    this.#advance();

    this.#pushDecl(structDefinition);
  }

  #memberExpression() {
    const memberExpression = {
      type: 'MemberExpression',
      left: '',
      right: [],
      parent: this.#targetExpr
    };

    memberExpression.left = this.#currentValue;

    this.#advance(2);

    const prevTargetExpr = this.#targetExpr;
    this.#targetExpr = memberExpression.right;

    this.parse(['EOL', 'KEYWORD', 'RPAREN', 'OPERATOR'], [undefined, 'then', undefined, '+', '-', '*', '/', '>', '<', '>=', '<=', '==', '!=']);

    this.#targetExpr = prevTargetExpr;

    this.#pushDecl(memberExpression);
  }

  // ===========================================================================
  // ===========================================================================

  #arrayAccessExpression() {
    const arrayAccessExpression = {
      type: 'ArrayAccessExpression',
      name: '',
      body: [],
      parent: this.#targetExpr
    };

    arrayAccessExpression.name = this.#currentValue;

    this.#advance(2);

    const prevTargetExpr = this.#targetExpr;
    this.#targetExpr = arrayAccessExpression.body;

    this.parse('OPERATOR', ']');

    this.#targetExpr = prevTargetExpr;

    this.#advance();

    //console.log(this.#currentType, this.#currentValue)

    this.#pushDecl(arrayAccessExpression);
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

  #expression() {
    const decl = {
      type: 'Expression',
      mnemonic: '',
      body: [],
      parent: this.#targetExpr
    };

    decl.mnemonic = this.#currentValue;

    this.#advance(); // expression name

    this.#targetExpr = decl.body;

    this.parse('EOL');

    this.#advance(); // next line

    this.#targetExpr = decl.parent;

    this.#pushDecl(decl);
  }

  #moveExpression() {
    const decl = {
      type: 'MoveExpression',
      body: [],
      parent: this.#targetExpr
    };

    this.#advance(); // expression name

    this.#targetExpr = decl.body;

    this.parse('EOL');

    this.#advance(); // next line

    this.#targetExpr = decl.parent;

    this.#pushDecl(decl);
  }

  #errExpression() {
    const decl = {
      type: 'ErrExpression',
      message: '',
      parent: this.#targetExpr
    };

    this.#advance(); // expression name

    decl.message = this.#currentValue;

    this.#advance();

    this.#pushDecl(decl);
  }

  #errbExpression() {
    const decl = {
      type: 'ErrbExpression',
      variable: '',
      message: '',
      parent: this.#targetExpr
    };

    this.#advance(); // expression name

    decl.variable = this.#currentValue;

    if (this.#peekType !== 'EOL') {
      this.#advance(2);

      decl.message = this.#currentValue;
    }

    this.#advance();

    this.#pushDecl(decl);
  }

  #errnbExpression() {
    const decl = {
      type: 'ErrnbExpression',
      variable: '',
      message: '',
      parent: this.#targetExpr
    };

    this.#advance(); // expression name

    decl.variable = this.#currentValue;

    if (this.#peekType !== 'EOL') {
      this.#advance(2);

      decl.message = this.#currentValue;
    }

    this.#advance();

    this.#pushDecl(decl);
  }

  #errnzExpression() {
    const decl = {
      type: 'ErrnzExpression',
      variable: '',
      message: '',
      parent: this.#targetExpr
    };

    this.#advance(); // expression name

    decl.variable = this.#currentValue;

    if (this.#peekType !== 'EOL') {
      this.#advance(2);

      decl.message = this.#currentValue;
    }

    this.#advance();

    this.#pushDecl(decl);
  }

  #erreExpression() {
    const decl = {
      type: 'ErreExpression',
      variable: '',
      message: '',
      parent: this.#targetExpr
    };

    this.#advance(); // expression name

    decl.variable = this.#currentValue;

    if (this.#peekType !== 'EOL') {
      this.#advance(2);

      decl.message = this.#currentValue;
    }

    this.#advance();

    this.#pushDecl(decl);
  }

  #echoExpression() {
    const decl = {
      type: 'EchoExpression',
      message: '',
      parent: this.#targetExpr
    };

    this.#advance(); // expression name

    decl.message = this.#currentValue;

    this.#advance();

    this.#pushDecl(decl);
  }

  #callExpression() {
    const decl = {
      type: 'CallExpression',
      body: [],
      parent: this.#targetExpr
    };

    this.#advance(); // expression name

    this.#targetExpr = decl.body;

    this.parse('EOL');

    this.#advance(); // next line

    this.#targetExpr = decl.parent;

    this.#pushDecl(decl);
  }

  #invokeExpression() {
    const decl = {
      type: 'InvokeExpression',
      body: [],
      parent: this.#targetExpr
    };

    this.#advance(); // expression name

    this.#targetExpr = decl.body;

    this.parse('EOL');

    this.#advance(); // next line

    this.#targetExpr = decl.parent;

    this.#pushDecl(decl);
  }

  #pushExpression() {
    const decl = {
      type: 'PushExpression',
      body: [],
      parent: this.#targetExpr
    };

    this.#advance(); // expression name

    this.#targetExpr = decl.body;

    this.parse('EOL');

    this.#advance(); // next line

    this.#targetExpr = decl.parent;

    this.#pushDecl(decl);
  }

  #popExpression() {
    const decl = {
      type: 'PopExpression',
      body: [],
      parent: this.#targetExpr
    };

    this.#advance(); // expression name

    this.#targetExpr = decl.body;

    this.parse('EOL');

    this.#advance(); // next line

    this.#targetExpr = decl.parent;

    this.#pushDecl(decl);
  }

  #jumpExpression() {
    const decl = {
      type: 'JumpExpression',
      body: [],
      parent: this.#targetExpr
    };

    this.#advance(); // expression name

    this.#targetExpr = decl.body;

    this.parse('EOL');

    this.#advance(); // next line

    this.#targetExpr = decl.parent;

    this.#pushDecl(decl);
  }

  #incExpression() {
    const decl = {
      type: 'IncExpression',
      body: [],
      parent: this.#targetExpr
    };

    this.#advance(); // expression name

    this.#targetExpr = decl.body;

    this.parse('EOL');

    this.#advance(); // next line

    this.#targetExpr = decl.parent;

    this.#pushDecl(decl);
  }


  #decExpression() {
    const decl = {
      type: 'DecExpression',
      body: [],
      parent: this.#targetExpr
    };

    this.#advance(); // expression name

    this.#targetExpr = decl.body;

    this.parse('EOL');

    this.#advance(); // next line

    this.#targetExpr = decl.parent;

    this.#pushDecl(decl);
  }

  #addExpression() {
    const decl = {
      type: 'AddExpression',
      body: [],
      parent: this.#targetExpr
    };

    this.#advance(); // expression name

    this.#targetExpr = decl.body;

    this.parse('EOL');

    this.#advance(); // next line

    this.#targetExpr = decl.parent;

    this.#pushDecl(decl);
  }

  #subExpression() {
    const decl = {
      type: 'SubExpression',
      body: [],
      parent: this.#targetExpr
    };

    this.#advance(); // expression name

    this.#targetExpr = decl.body;

    this.parse('EOL');

    this.#advance(); // next line

    this.#targetExpr = decl.parent;

    this.#pushDecl(decl);
  }

  #whileExpression() {
    const decl = {
      type: 'WhileExpression',
      left: [],
      operator: '',
      right: [],
      body: [],
      parent: this.#targetExpr
    };

    this.#advance(); // test left

    this.#targetExpr = decl.left;

    this.parse('OPERATOR', ['>', '<', '>=', '<=', '==', '!=']);

    decl.operator = this.#currentValue;

    this.#advance(); // test right

    this.#targetExpr = decl.right;

    this.parse('EOL');

    this.#advance();

    this.#targetExpr = decl.body;

    this.parse('KEYWORD', '.endw');

    this.#targetExpr = decl.parent;

    this.#advance();

    this.#pushDecl(decl);
  }

  #forStatement() {
    const forStatement = {
      type: 'ForStatement',
      indexVar: '',
      from: [],
      to: [],
      body: [],
      parent: this.#targetExpr
    };

    this.#advance();

    forStatement.indexVar = this.#currentValue;

    this.#advance();

    //console.log(this.#currentType, this.#currentValue);

    let prevTargetExpr = this.#targetExpr;

    if (this.#currentType !== 'OPERATOR' || this.#currentValue !== ',') {
      this.#advance();

      this.#targetExpr = forStatement.from;

      this.parse(['KEYWORD', 'OPERATOR'], ['to', ',']);

      this.#targetExpr = prevTargetExpr;
    }

    this.#advance();

    //console.log(forStatement);

    prevTargetExpr = this.#targetExpr;

    this.#targetExpr = forStatement.to;
    
    this.parse('EOL');

    this.#targetExpr = prevTargetExpr;
    
    this.#advance();

    prevTargetExpr = this.#targetExpr;

    this.#targetExpr = forStatement.body;

    this.parse('KEYWORD', 'end');

    this.#targetExpr = prevTargetExpr;

    this.#advance();

    this.#pushDecl(forStatement);

    //console.log(forStatement);
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

  #assignmentExpression() {
    const assignmentExpression = {
      type: 'AssignmentExpression',
      left: '',
      right: [],
      parent: this.#targetExpr
    };

    assignmentExpression.left = this.#currentValue;

    this.#advance(2);

    const prevTargetExpr = this.#targetExpr;

    this.#targetExpr = assignmentExpression.right;

    this.parse(['RBRACE', 'OPERATOR', 'EOL'], [undefined, ',', undefined]);

    this.#targetExpr = prevTargetExpr;

    if (this.#currentType === 'OPERATOR' && this.#currentValue === ',') {
      this.#advance();
    }

    this.#pushDecl(assignmentExpression);
  }

  // ===========================================================================
  // ===========================================================================

  #conditionExpression() {
    const conditionExpression = {
      type: 'ConditionExpression',
      body: [],
      parent: this.#targetExpr
    };

    this.#advance();

    const prevTargetExpr = this.#targetExpr;

    this.#targetExpr = conditionExpression.body;

    this.parse('EOL');

    this.#targetExpr = prevTargetExpr;

    this.#pushDecl(conditionExpression);
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

  #labelDeclaration() {
    const decl = {
      type: 'LabelDeclaration',
      name: '',
      body: [],
      parent: this.#targetExpr
    };

    decl.name = this.#currentValue;

    this.#advance(2);

    this.#targetExpr = decl.body;

    this.parse('KEYWORD', 'jmp');

    this.#targetExpr = decl.parent;

    this.#pushDecl(decl);
  }

  #sizestrStatement() {
    const decl = {
      type: 'SizestrStatement',
      body: [],
      parent: this.#targetExpr
    };

    this.#advance();

    this.#targetExpr = decl.body;

    this.parse('EOL');

    this.#targetExpr = decl.parent;

    this.#pushDecl(decl);
  }

  #sizeofStatement() {
    const decl = {
      type: 'SizeofStatement',
      body: [],
      parent: this.#targetExpr
    };

    this.#advance();

    this.#targetExpr = decl.body;

    this.parse('EOL');

    this.#targetExpr = decl.parent;

    this.#pushDecl(decl);
  }

  #substrStatement() {
    const decl = {
      type: 'SubstrStatement',
      variable: '',
      position: '',
      length: undefined,
      parent: this.#targetExpr
    };

    this.#advance();

    decl.variable = this.#currentValue;

    this.#advance(2);

    decl.position = this.#currentValue;

    if (this.#peekType !== 'EOL') {
      this.#advance(2);

      decl.length = this.#currentValue;
    }

    this.#advance();

    this.#pushDecl(decl);
  }

  #catstrStatement() {
    const decl = {
      type: 'CatstrStatement',
      variable1: '',
      variable2: '',
      parent: this.#targetExpr
    };

    this.#advance();

    decl.variable1 = this.#currentValue;

    this.#advance(2);

    decl.variable2 = this.#currentValue;

    this.#advance();

    this.#pushDecl(decl);
  }

  #identifier() {
    if (this.#peekType === 'KEYWORD' && this.#peekValue === 'PROC') {
      this.#procedureDefinition();
      return;
    }

    if (this.#peekType === 'KEYWORD' && this.#peekValue === 'ENDP') {
      this.#advance(); // move to endp
      return;
    }

    if (this.#peekType === 'KEYWORD' && ['BYTE', 'WORD', 'DWORD', 'QWORD', 'REAL4', 'REAL8'].includes(this.#peekValue)) {
      this.#variableDeclaration();
      return;
    }

    if (this.#peekType === 'OPERATOR' && this.#peekValue === ':' && this.#peek(2).type === 'EOL') {
      this.#labelDeclaration();
      return;
    }

    const identifier = {
      type: 'Identifier',
      value: '',
      parent: this.#targetExpr
    };

    /*
    if (this.#peekType === 'OPERATOR' && (this.#peekValue === '.' || this.#peekValue === '->')) {
      //console.log('member', this.#currentType, this.#currentValue);

      this.#memberExpression();
      return;
    }

    if (this.#peekType === 'OPERATOR' && this.#peekValue === '[') {
      //console.log('aa', this.#currentType, this.#currentValue);

      this.#arrayAccessExpression();
      return;
    }

    if (this.#parentExprType !== 'SetExpression' && this.#peekType === 'OPERATOR' && this.#peekValue === '=') {
      //console.log(this.#targetExpr.parent);
      this.#assignmentExpression();
      return;
    }
    */

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
    /*
    if (Object.keys(Parser.#NATIVE_TYPES).includes(this.#currentValue.toLowerCase()) && this.#targetExpr.type === 'GlobalsDeclaration') {
      this.#variableDeclaration();
      return;
    }
    */

    switch (this.#currentValue.toLowerCase()) {
      case '.data':
        this.#dataSection();
        break;

      case '.code':
        this.#codeSection();
        break;

      case 'lea':
      case 'log':
        this.#expression();
        break;
        
      case 'jmp':
        this.#jumpExpression();
        break;

      case 'inc':
        this.#incExpression();
        break;

      case 'dec':
        this.#decExpression();
        break;

      case 'mov':
        this.#moveExpression();
        break;

      case 'add':
        this.#addExpression();
        break;

      case 'sub':
        this.#subExpression();
        break;

      case 'push':
        this.#pushExpression();
        break;

      case 'pop':
        this.#popExpression();
        break;

      case 'call':
        this.#callExpression();
        break;

      case 'invoke':
        this.#invokeExpression();
        break;

      case '.while':
        this.#whileExpression();
        break;

      case '.if':
        this.#ifStatement();
        break;

      case '.err':
        this.#errExpression();
        break;

      case '.errb':
        this.#errbExpression();
        break;

      case '.errnb':
        this.#errnbExpression();
        break;

      case '.erre':
        this.#erreExpression();
        break;

      case '.errnz':
        this.#errnzExpression();
        break;

      case 'sizestr':
        this.#sizestrStatement();
        break;

      case 'sizeof':
        this.#sizeofStatement();
        break;

      case 'substr':
        this.#substrStatement();
        break;

      case 'catstr':
        this.#catstrStatement();
        break;

      case 'echo':
        this.#echoExpression();
        break;

      case 'exitwhen':
        this.#exitwhenExpression();
        break;

      case 'debug':
        this.#debugExpression();
        break;

      case 'for':
        this.#forStatement();
        break;

      case 'condition':
      case 'expect':
        this.#conditionExpression();
        break;

      case 'is':
      case 'not':
      case 'new':
      case 'null':
      case 'and':
      case 'or':
        this.#operator();
        break;
    }
  }

  parse(endType = 'EOF', endValue = undefined, skipEol = true) {
    if (!Array.isArray(endType)) {
      endType = [endType];
    }

    while (!endType.includes(this.#currentType)
      || (Array.isArray(endValue) ? !endValue.includes(this.#currentValue?.toLocaleLowerCase()) : this.#currentValue?.toLowerCase() !== endValue)) {
      if (this.#attempt <= 0) {
        return;
      }

      //console.log(this.#currentType, this.#currentValue, endType, endValue);
      

      if (skipEol && this.#currentType === 'EOL') {
        this.#advance();
        continue;
      }

      //console.log(util.inspect(this.#targetExpr));

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
