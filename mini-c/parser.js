export default class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.current = 0;

    this.PRECEDENCE = {
      '=': 5,  // Assignment operator
      '&&': 12,
      '||': 12,
      '<': 15, // Comparison operators
      '>': 15,
      '<=': 15,
      '>=': 15,
      '==': 15,
      '!=': 15,
      '+': 20, // Addition and subtraction
      '-': 20,
      '*': 30, // Multiplication and division
      '/': 30,
      '++': 40, // Increment operator
      '--': 40  // Decrement operator
    };
  }

  peek() {
    return this.tokens[this.current];
  }

  consume() {
    return this.tokens[this.current++];
  }

  match(type, value = null) {
    const token = this.peek();
    if (!token || token.type !== type) return false;
    if (value !== null && token.value !== value) return false;
    return true;
  }

  getPrecedence(operator) {
    return this.PRECEDENCE[operator] || 0;
  }

  parsePrimary() {
    const token = this.peek();
  
    // Handle prefix unary operators (e.g., ++i, --i)
    if (token.type === 'OPERATOR' && (token.value === '++' || token.value === '--')) {
      const operator = this.consume().value; // consume '++' or '--'
      const argument = this.parsePrimary(); // Parse the operand (e.g., 'i')
      return {
        type: 'UnaryExpression',
        operator,
        argument,
        prefix: true, // Prefix operator
        line: token.line,
      };
    }

    // Handle unary '!' operator
    if (this.match('OPERATOR', '!')) {
      const opToken = this.consume(); // consume '!'
      const argument = this.parsePrimary(); // parse what follows
      return {
        type: 'UnaryExpression',
        operator: opToken.value,
        argument,
        line: opToken.line
      };
    }
  
    // Handle array expressions (e.g., [1, 2, 3])
    if (this.match('LBRACKET')) {
      const arrayExpr = this.parseArrayExpression();
  
      // Check if the array is followed by a member expression (e.g., .reduce)
      if (this.match('OPERATOR', '.')) {
        return this.parseMemberExpression(arrayExpr);
      }
  
      return arrayExpr;
    }
  
    const consumedToken = this.consume();

    // If it's 'async', parse the entire lambda inline
    if (consumedToken.type === 'KEYWORD' && consumedToken.value === 'async') {
      if (
        this.match('KEYWORD') &&
        ['int', 'float', 'void', 'string', 'bool'].includes(this.peek().value) &&
        this.tokens[this.current + 1] &&
        this.tokens[this.current + 1].type === 'LPAREN'
      ) {
        return this.parseLambdaExpression(true); 
      } else {
        throw new Error(`Parse error on line ${consumedToken.line}: Unhandled async usage`);
      }
    }
  
    // Handle identifiers (e.g., variable names, member expressions, function calls)
    if (consumedToken.type === 'IDENTIFIER') {
      let object = {
        type: 'Identifier',
        name: consumedToken.value,
        line: consumedToken.line,
      };
  
      // Handle member expressions (e.g., obj.property)
      if (this.match('OPERATOR', '.')) {
        object = this.parseMemberExpression(object);
      }
  
      // Handle function calls (e.g., func(1, 2))
      if (this.match('LPAREN')) {
        return this.parseCallExpression(object);
      }
  
      return object;
    }
  
    // Handle string literals
    if (consumedToken.type === 'STRING') {
      return { type: 'StringLiteral', value: consumedToken.value, line: consumedToken.line };
    }
  
    // Handle numeric literals
    if (consumedToken.type === 'NUMBER') {
      return { type: 'NumericLiteral', value: consumedToken.value, line: consumedToken.line };
    }
  
    // Handle boolean literals (true/false)
    if (consumedToken.type === 'KEYWORD' && (consumedToken.value === 'true' || consumedToken.value === 'false')) {
      return { type: 'BooleanLiteral', value: consumedToken.value === 'true', line: consumedToken.line };
    }
  
    // Handle null literal
    if (consumedToken.type === 'KEYWORD' && consumedToken.value === 'null') {
      return { type: 'NullLiteral', value: null, line: consumedToken.line };
    }
  
    // Handle grouped expressions (e.g., (a + b))
    if (consumedToken.type === 'LPAREN') {
      const expr = this.parseExpression();
      if (!this.match('RPAREN')) {
        throw new Error(`Parse error on line ${consumedToken.line}: Expected ')' after expression`);
      }
      this.consume(); // consume ')'
      return expr;
    }
  
    throw new Error(`Parse error on line ${consumedToken.line}: Unexpected token '${consumedToken.type}' with value '${consumedToken.value}'`);
  }

  parseExpression(precedence = 0) {
    // Check for lambda expression
    if (
      this.match('KEYWORD') &&
      ['int', 'float', 'void', 'string', 'bool', 'async'].includes(this.peek().value) &&
      this.tokens[this.current + 1] &&
      this.tokens[this.current + 1].type === 'LPAREN'
    ) {
      return this.parseLambdaExpression();
    }
  
    let left = this.parsePrimary();
  
    // Skip any EOL tokens before checking for member or call
    while (this.match('EOL')) {
      this.consume();
    }
  
    // Check for member (.) or call (...)
    while (true) {
      // Again skip EOL if needed
      while (this.match('EOL')) {
        this.consume();
      }
  
      if (this.match('OPERATOR', '.')) {
        left = this.parseMemberExpression(left);
      } else if (this.match('LPAREN')) {
        left = this.parseCallExpression(left);
      } else {
        break;
      }
    }
  
    // Now handle binary/assignment operators
    while (this.match('OPERATOR')) {
      const opToken = this.peek();
      const opPrecedence = this.getPrecedence(opToken.value);
      if (opPrecedence <= precedence) break;
  
      const operator = this.consume().value;
      if (operator === '=') {
        const right = this.parseExpression(opPrecedence);
        left = {
          type: 'AssignmentExpression',
          operator,
          left,
          right,
          line: opToken.line,
        };
      } else {
        const right = this.parseExpression(opPrecedence);
        left = {
          type: 'BinaryExpression',
          operator,
          left,
          right,
          line: opToken.line,
        };
      }
    }
  
    return left;
  }

  parseArrayExpression() {
    this.consume(); // Consume '['
  
    const elements = [];
    while (!this.match('RBRACKET')) {
      elements.push(this.parseExpression()); // Parse each element
  
      if (this.match('OPERATOR', ',')) {
        this.consume(); // Consume ',' between elements
      } else {
        break;
      }
    }
  
    if (!this.match('RBRACKET')) {
      throw new Error(`Parse error on line ${this.peek().line}: Expected ']' to close array`);
    }
    this.consume(); // Consume ']'
  
    return {
      type: 'ArrayExpression',
      elements,
      line: this.tokens[this.current - 1].line,
    };
  }

  parseFunctionDeclaration() {
    // Check for 'async' keyword
    let isAsync = false;
    if (this.match('KEYWORD', 'async')) {
      this.consume(); // consume 'async'
      isAsync = true;
    }
  
    // Parse the return type (e.g., 'void')
    const returnTypeToken = this.consume();
    const returnType = returnTypeToken.value;
  
    if (!this.match('IDENTIFIER')) {
      throw new Error(`Parse error on line ${returnTypeToken.line}: Expected function name`);
    }
    const nameToken = this.consume();
    const name = nameToken.value;
  
    if (!this.match('LPAREN')) {
      throw new Error(`Parse error on line ${nameToken.line}: Expected '(' after function name`);
    }
    this.consume(); // consume '('
  
    // Parse the parameter list
    const parameters = [];
    while (!this.match('RPAREN')) {
      const paramTypeToken = this.consume(); // e.g., 'Event'
      const paramType = paramTypeToken.value;
  
      if (!this.match('IDENTIFIER')) {
        throw new Error(`Parse error on line ${paramTypeToken.line}: Expected parameter name`);
      }
      const paramNameToken = this.consume();
      const paramName = paramNameToken.value;
  
      parameters.push({
        type: paramType,
        name: paramName,
        line: paramTypeToken.line,
      });
  
      if (this.match('OPERATOR', ',')) {
        this.consume(); // consume ','
      } else {
        break;
      }
    }
  
    if (!this.match('RPAREN')) {
      throw new Error(`Parse error on line ${nameToken.line}: Expected ')' after parameter list`);
    }
    this.consume(); // consume ')'
  
    if (!this.match('LBRACE')) {
      throw new Error(`Parse error on line ${nameToken.line}: Expected '{' after parameter list`);
    }
    this.consume(); // consume '{'
  
    // Parse the function body
    const body = this.parseStatements(['RBRACE']);
  
    if (!this.match('RBRACE')) {
      throw new Error(`Parse error on line ${this.peek().line}: Expected '}' after function body`);
    }
    this.consume(); // consume '}'
  
    return {
      type: 'FunctionDeclaration',
      isAsync,
      returnType,
      name,
      parameters,
      body,
      line: returnTypeToken.line,
    };
  }

  parseStructStatement() {
    // Consume 'struct' keyword
    const structToken = this.consume();
    if (structToken.type !== 'KEYWORD' || structToken.value !== 'struct') {
      throw new Error(`Parse error on line ${structToken.line}: Expected 'struct' keyword`);
    }

    // Expect struct name (identifier)
    if (!this.match('IDENTIFIER')) {
      throw new Error(`Parse error on line ${this.peek().line}: Expected struct name`);
    }
    const nameToken = this.consume();
    const structName = nameToken.value;

    // Expect '{'
    if (!this.match('LBRACE')) {
      throw new Error(`Parse error on line ${this.peek().line}: Expected '{' after struct name`);
    }
    this.consume(); // consume '{'

    // Parse struct fields
    const fields = [];
    while (!this.match('RBRACE')) {
      // Skip EOL tokens
      while (this.match('EOL')) {
        this.consume();
      }
      
      // Expect field type (keyword)
      if (!this.match('KEYWORD')) {
        throw new Error(`Parse error on line ${this.peek().line}: Expected field type`);
      }
      const fieldTypeToken = this.consume();
      const fieldType = fieldTypeToken.value;

      // Expect field name (identifier)
      if (!this.match('IDENTIFIER')) {
        throw new Error(`Parse error on line ${this.peek().line}: Expected field name`);
      }
      const fieldNameToken = this.consume();
      const fieldName = fieldNameToken.value;

      if (!this.match('SEMICOLON')) {
        throw new Error(`Parse error on line ${this.peek().line}: Expected semicolon`);
      }
      this.consume();

      fields.push({
        type: fieldType,
        name: fieldName,
        line: fieldTypeToken.line,
      });

      // Optional: consume EOL or semicolon
      if (this.match('EOL')) {
        this.consume();
      }
    }

    // Expect '}'
    if (!this.match('RBRACE')) {
      throw new Error(`Parse error on line ${this.peek().line}: Expected '}' to close struct`);
    }
    this.consume(); // consume '}'

    // Optional: consume EOL
    if (this.match('EOL')) {
      this.consume();
    }

    return {
      type: 'StructDeclaration',
      name: structName,
      fields,
      line: structToken.line,
    };
  }

  parseVariableDeclaration() {
    // Check for 'const' keyword
    let isConst = false;
    if (this.match('KEYWORD', 'const')) {
      this.consume(); // consume 'const'
      isConst = true;
    }
  
    const typeToken = this.consume(); // e.g., 'int'
    let type = typeToken.value;
  
    // Check for array type (e.g., 'int[]')
    if (this.match('LBRACKET')) {
      this.consume(); // consume '['
      if (!this.match('RBRACKET')) {
        throw new Error(`Parse error on line ${this.peek().line}: Expected ']' after '[' for array type`);
      }
      this.consume(); // consume ']'
      type += '[]'; // Append '[]' to the type
    }
  
    // Check for nullable indicator (?)
    let nullable = false;
    if (this.match('OPERATOR', '?')) {
      this.consume(); // consume '?'
      nullable = true;
    }
  
    if (!this.match('IDENTIFIER')) {
      throw new Error(`Expected variable name at line ${this.peek().line}, got ${this.peek().type}: '${this.peek().value}'`);
    }
    const nameToken = this.consume();
    const name = nameToken.value;
  
    let init = null;
    if (this.match('OPERATOR', '=')) {
      this.consume(); // consume '='
      init = this.parseExpression();
    }
  
    // Optional: consume EOL or semicolon here
    if (this.match('EOL')) this.consume();
  
    return {
      type: 'VariableDeclaration',
      varType: type,
      nullable,
      isConst,
      name,
      init,
      line: typeToken.line,
    };
  }

  parseMemberExpression(object) {
    // Member expressions can chain (e.g., [1, 2, 3].reduce().somethingElse())
    while (this.match('OPERATOR', '.')) {
      const dotToken = this.consume(); // Consume '.'
  
      // Consume the member identifier
      if (!this.match('IDENTIFIER')) {
        throw new Error(`Parse error on line ${dotToken.line}: Expected identifier after '.'`);
      }
  
      const propertyToken = this.consume();
      let member = {
        type: 'MemberExpression',
        object: object,
        property: {
          type: 'Identifier',
          name: propertyToken.value,
          line: propertyToken.line,
        },
        line: dotToken.line,
      };
  
      // Check if the member is followed by a function call
      if (this.match('LPAREN')) {
        member = this.parseCallExpression(member);
      }
  
      object = member;
    }
  
    return object;
  }

  parseCallExpression(callee) {
    this.consume(); // Consume '('
  
    const args = [];
    while (!this.match('RPAREN')) {
      args.push(this.parseExpression());
  
      if (this.match('OPERATOR', ',')) {
        this.consume(); // Consume ',' between arguments
      } else {
        break;
      }
    }
  
    if (!this.match('RPAREN')) {
      throw new Error(`Parse error on line ${callee.line}: Expected ')' after function call arguments`);
    }
    this.consume(); // Consume ')'
  
    return {
      type: 'CallExpression',
      callee,
      arguments: args,
      line: callee.line,
    };
  }

  parseLambdaExpression(pIsAsync = false) {
    // Check for 'async' keyword
    let isAsync = pIsAsync;
    if (this.match('KEYWORD', 'async')) {
      this.consume(); // consume 'async'
      isAsync = true;
    }
  
    // Parse the return type (e.g., 'void')
    const returnTypeToken = this.consume();
    const returnType = returnTypeToken.value;
  
    if (!this.match('LPAREN')) {
      throw new Error(`Parse error on line ${returnTypeToken.line}: Expected '(' after return type`);
    }
    this.consume(); // consume '('
  
    // Parse the parameter list
    const parameters = [];
    while (!this.match('RPAREN')) {
      const paramTypeToken = this.consume(); // e.g., 'Event'
      const paramType = paramTypeToken.value;
  
      if (!this.match('IDENTIFIER')) {
        throw new Error(`Parse error on line ${paramTypeToken.line}: Expected parameter name`);
      }
      const paramNameToken = this.consume();
      const paramName = paramNameToken.value;
  
      parameters.push({
        type: paramType,
        name: paramName,
        line: paramTypeToken.line,
      });
  
      if (this.match('OPERATOR', ',')) {
        this.consume(); // consume ','
      } else {
        break;
      }
    }
  
    if (!this.match('RPAREN')) {
      throw new Error(`Parse error on line ${returnTypeToken.line}: Expected ')' after parameter list`);
    }
    this.consume(); // consume ')'
  
    // Check for arrow function syntax (=>) or block-style lambda with '{'
    let body;
    if (this.match('OPERATOR', '=>')) {
      this.consume(); // consume '=>'
  
      // Parse the body of the arrow function
      if (this.match('LBRACE')) {
        this.consume(); // consume '{'
        body = this.parseStatements(['RBRACE']);
        if (!this.match('RBRACE')) {
          throw new Error(`Parse error on line ${this.peek().line}: Expected '}' after lambda body`);
        }
        this.consume(); // consume '}'
      } else {
        // Single statement without braces
        body = [this.parseExpression()];
      }
    } else if (this.match('LBRACE')) {
      // Block-style lambda with '{'
      this.consume(); // consume '{'
      body = this.parseStatements(['RBRACE']);
      if (!this.match('RBRACE')) {
        throw new Error(`Parse error on line ${this.peek().line}: Expected '}' after lambda body`);
      }
      this.consume(); // consume '}'
    } else {
      throw new Error(`Parse error on line ${this.peek().line}: Expected '=>' or '{' after parameter list`);
    }
  
    return {
      type: 'LambdaExpression',
      isAsync,
      returnType,
      parameters,
      body,
      line: returnTypeToken.line,
    };
  }

  parseForStatement() {
    const forToken = this.consume(); // consume 'for'

    // Expect '('
    if (!this.match('LPAREN')) {
      throw new Error(`Parse error on line ${forToken.line}: Expected '(' after 'for'`);
    }
    this.consume(); // consume '('

    // Parse initializer (e.g., int i = 0)
    let initializer = null;
    if (!this.match('SEMICOLON')) {
      initializer = this.parseStatement(false); // Do not consume semicolon here

      // Ensure the initializer is followed by a semicolon
      if (!this.match('SEMICOLON')) {
        throw new Error(`Parse error on line ${this.peek().line}: Expected ';' after initializer`);
      }
      this.consume(); // consume ';'
    } else {
      this.consume(); // consume ';' if no initializer is present
    }

    // Parse condition (e.g., i < 10)
    let condition = null;
    if (!this.match('SEMICOLON')) {
      condition = this.parseExpression();

      // Ensure the condition is followed by a semicolon
      if (!this.match('SEMICOLON')) {
        throw new Error(`Parse error on line ${this.peek().line}: Expected ';' after condition`);
      }
      this.consume(); // consume ';'
    } else {
      this.consume(); // consume ';' if no condition is present
    }

    // Parse increment (e.g., i++)
    let increment = null;
    if (!this.match('RPAREN')) {
      increment = this.parseExpression();
    }

    // Expect ')'
    if (!this.match('RPAREN')) {
      throw new Error(`Parse error on line ${this.peek().line}: Expected ')' after increment`);
    }
    this.consume(); // consume ')'

    // Expect '{'
    if (!this.match('LBRACE')) {
      throw new Error(`Parse error on line ${this.peek().line}: Expected '{' to start for loop body`);
    }
    this.consume(); // consume '{'

    // Parse body statements until '}'
    const body = this.parseStatements(['RBRACE']);

    // Expect '}'
    if (!this.match('RBRACE')) {
      throw new Error(`Parse error on line ${this.peek().line}: Expected '}' to close for loop body`);
    }
    this.consume(); // consume '}'

    return {
      type: 'ForStatement',
      initializer,
      condition,
      increment,
      body,
      line: forToken.line,
    };
  }

  parseIfStatement() {
    const ifToken = this.consume(); // consume 'if'

    // Expect '('
    if (!this.match('LPAREN')) {
      throw new Error(`Parse error on line ${ifToken.line}: Expected '(' after 'if'`);
    }
    this.consume(); // consume '('

    // Parse condition
    const condition = this.parseExpression();

    // Expect ')'
    if (!this.match('RPAREN')) {
      throw new Error(`Parse error on line ${this.peek().line}: Expected ')' after condition`);
    }
    this.consume(); // consume ')'

    // Expect '{'
    if (!this.match('LBRACE')) {
      throw new Error(`Parse error on line ${this.peek().line}: Expected '{' to start 'if' block`);
    }
    this.consume(); // consume '{'

    // Parse 'if' block statements
    const consequent = this.parseStatements(['RBRACE']);

    // Expect '}'
    if (!this.match('RBRACE')) {
      throw new Error(`Parse error on line ${this.peek().line}: Expected '}' to close 'if' block`);
    }
    this.consume(); // consume '}'

    // Parse optional 'else' or 'elseif'
    let alternate = null;
    if (this.match('KEYWORD', 'else')) {
      this.consume(); // consume 'else'

      if (this.match('KEYWORD', 'if')) {
        // Parse 'elseif' as a nested 'if' statement
        alternate = this.parseIfStatement();
      } else {
        // Expect '{'
        if (!this.match('LBRACE')) {
          throw new Error(`Parse error on line ${this.peek().line}: Expected '{' to start 'else' block`);
        }
        this.consume(); // consume '{'

        // Parse 'else' block statements
        alternate = this.parseStatements(['RBRACE']);

        // Expect '}'
        if (!this.match('RBRACE')) {
          throw new Error(`Parse error on line ${this.peek().line}: Expected '}' to close 'else' block`);
        }
        this.consume(); // consume '}'
      }
    }

    return {
      type: 'IfStatement',
      condition,
      consequent,
      alternate,
      line: ifToken.line,
    };
  }

  parseReturnStatement() {
    const returnToken = this.consume(); // consume 'return' keyword

    // Parse the expression after 'return'
    const argument = this.parseExpression();

    // Optional: consume an EOL or semicolon if your grammar uses it
    if (this.match('EOL')) {
      this.consume();
    }

    return {
      type: 'ReturnStatement',
      argument,
      line: returnToken.line
    };
  }

  // Parse a single statement (return, expression, etc)
  parseStatement(consumeSemicolon = true) {
    if (this.match('EOL')) {
      this.consume();
      return null; // empty statement, skip
    }

    if (this.match('KEYWORD', 'return')) {
      const statement = this.parseReturnStatement();
      if (consumeSemicolon && this.match('SEMICOLON')) this.consume(); // Consume semicolon if allowed
      return statement;
    }

    if (this.match('KEYWORD', 'if')) {
      return this.parseIfStatement();
    }

    if (this.match('KEYWORD', 'for')) {
      return this.parseForStatement();
    }

    // Add support for struct declarations
    if (this.match('KEYWORD', 'struct')) {
      return this.parseStructStatement();
    }

    // Support async returns (built-in or user-defined)
    if (
      // Check if 'async' is present
      this.match('KEYWORD', 'async') &&
      // Check if next token is a built-in type or IDENTIFIER (user-defined)
      this.tokens[this.current + 1] &&
      (
        (this.tokens[this.current + 1].type === 'KEYWORD' &&
          ['void', 'int', 'float', 'string', 'bool'].includes(this.tokens[this.current + 1].value)) ||
        this.tokens[this.current + 1].type === 'IDENTIFIER'
      ) &&
      // Next token must be function name
      this.tokens[this.current + 2] && this.tokens[this.current + 2].type === 'IDENTIFIER' &&
      // Then '('
      this.tokens[this.current + 3] && this.tokens[this.current + 3].type === 'LPAREN'
    ) {
      return this.parseFunctionDeclaration();
    }

    // Built-in or user-defined return type (non-async)
    if (
      // Built-in type keyword or IDENTIFIER
      ((this.match('KEYWORD') &&
        ['void', 'int', 'float', 'string', 'bool'].includes(this.peek().value))
        || this.match('IDENTIFIER')) &&
      // Next token is IDENTIFIER for function name
      this.tokens[this.current + 1] && this.tokens[this.current + 1].type === 'IDENTIFIER' &&
      // Then '('
      this.tokens[this.current + 2] && this.tokens[this.current + 2].type === 'LPAREN'
    ) {
      return this.parseFunctionDeclaration();
    }

    // Detect variable declaration starting with a type keyword or custom type
    if (
      this.match('KEYWORD', 'const') ||
      this.match('KEYWORD') ||
      (this.match('IDENTIFIER') && this.tokens[this.current + 1] && this.tokens[this.current + 1].type === 'IDENTIFIER')
    ) {
      const statement = this.parseVariableDeclaration();
      if (consumeSemicolon && this.match('SEMICOLON')) this.consume(); // Consume semicolon if allowed
      return statement;
    }

    // Default: parse an expression statement
    const expr = this.parseExpression();
    if (consumeSemicolon && this.match('SEMICOLON')) this.consume(); // Consume semicolon if allowed
    if (this.match('EOL')) this.consume();
    return { type: 'ExpressionStatement', expression: expr };
  }

  // Parse multiple statements until a stop condition (e.g., RBRACE or EOF)
  parseStatements(stopTypes = ['RBRACE', 'EOF']) {
    const statements = [];
    while (!stopTypes.some(type => this.match(type))) {
      const stmt = this.parseStatement();
      if (stmt !== null) {
        statements.push(stmt);
      }
    }
    return statements;
  }

  parse() {
    return this.parseStatements(['EOF']);
  }
}
