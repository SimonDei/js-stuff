export default class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.current = 0;

    this.PRECEDENCE = {
      '=': 5,  // Assignment operator
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

    const consumedToken = this.consume();

    if (consumedToken.type === 'IDENTIFIER') {
      // Try to parse member expression first
      let object = {
        type: 'Identifier',
        name: consumedToken.value,
        line: consumedToken.line,
      };

      // Handle member expressions (e.g., p.age)
      if (this.match('OPERATOR', '.')) {
        object = this.parseMemberExpression(object);
      }

      // Handle function calls (e.g., add_two(3, 4))
      if (this.match('LPAREN')) {
        return this.parseCallExpression(object);
      }

      return object;
    }

    if (consumedToken.type === 'STRING') {
      return { type: 'StringLiteral', value: consumedToken.value, line: consumedToken.line };
    }

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
    let left = this.parsePrimary();

    while (this.match('OPERATOR')) {
      const opToken = this.peek();
      const opPrecedence = this.getPrecedence(opToken.value);

      if (opPrecedence <= precedence) break;

      const operator = this.consume().value;

      // Handle assignment expressions (e.g., p.age = 10)
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
        // Handle binary expressions (e.g., a + b)
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

  parseFunctionDeclaration() {
    const returnTypeToken = this.consume();
    if (
      returnTypeToken.type !== 'KEYWORD' ||
      !['void', 'int', 'float', 'string', 'bool'].includes(returnTypeToken.value)
    ) {
      throw new Error(`Expected return type at line ${returnTypeToken.line}`);
    }

    // Expect function name identifier
    const nameToken = this.consume();
    if (nameToken.type !== 'IDENTIFIER') {
      throw new Error(`Expected function name at line ${nameToken.line}`);
    }
    const name = nameToken.value;

    // Expect '('
    if (!this.match('LPAREN')) {
      throw new Error(`Expected '(' after function name at line ${this.peek().line}`);
    }
    this.consume(); // consume '('

    // Parse parameters
    const params = [];
    while (!this.match('RPAREN')) {
      // Special case: void as the only parameter
      if (this.match('KEYWORD', 'void')) {
        this.consume(); // consume 'void'
        if (!this.match('RPAREN')) {
          throw new Error(`Unexpected token after 'void' in parameter list at line ${this.peek().line}`);
        }
      } else {
        // Expect type (keyword)
        if (!this.match('KEYWORD')) {
          throw new Error(`Expected parameter type at line ${this.peek().line}`);
        }
        const paramTypeToken = this.consume();
        let paramType = paramTypeToken.value;

        // Check for nullable indicator (?)
        let nullable = false;
        if (this.match('OPERATOR', '?')) {
          this.consume(); // consume '?'
          nullable = true;
        }

        // Expect param name (identifier)
        if (!this.match('IDENTIFIER')) {
          throw new Error(`Expected parameter name at line ${this.peek().line}`);
        }
        const paramName = this.consume().value;

        params.push({ type: paramType, name: paramName, nullable });

        // If next token is ',', consume and continue params
        if (this.match('OPERATOR', ',')) {
          this.consume();
        } else {
          break;
        }
      }
    }

    // Expect ')'
    if (!this.match('RPAREN')) {
      throw new Error(`Expected ')' after parameters at line ${this.peek().line}`);
    }
    this.consume(); // consume ')'

    // Expect '{'
    if (!this.match('LBRACE')) {
      throw new Error(`Expected '{' to start function body at line ${this.peek().line}`);
    }
    this.consume(); // consume '{'

    // Parse body statements until '}'
    const bodyStatements = this.parseStatements(['RBRACE', 'EOF']);

    if (!this.match('RBRACE')) {
      throw new Error(`Expected '}' to close function body at line ${this.peek().line}`);
    }
    this.consume(); // consume '}'

    return {
      type: 'FunctionDeclaration',
      returnType: returnTypeToken.value,
      name,
      params,
      body: bodyStatements,
      line: returnTypeToken.line
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

    const typeToken = this.consume(); // e.g. 'int'
    const type = typeToken.value;

    // Check for nullable indicator (?)
    let nullable = false;
    if (this.match('OPERATOR', '?')) {
      this.consume(); // consume '?'
      nullable = true;
    }

    if (!this.match('IDENTIFIER')) {
      throw new Error(`Expected variable name at line ${this.peek().line}`);
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
      line: typeToken.line
    };
  }

  parseMemberExpression(object) {
    // Member expressions can chain (e.g., Math.random.seed())
    while (this.match('OPERATOR', '.')) {
      const dotToken = this.consume();
      
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
          line: propertyToken.line
        },
        line: dotToken.line
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
    // We already consumed the callee (an Identifier)
    // Current token should be '('
    this.consume(); // consume '('

    const args = [];
    while (!this.match('RPAREN')) {
      args.push(this.parseExpression());

      if (this.match('OPERATOR', ',')) {
        this.consume();
      } else {
        break;
      }
    }

    if (!this.match('RPAREN')) {
      throw new Error(`Parse error on line ${callee.line}: Expected ')' after function call arguments`);
    }
    this.consume(); // consume ')'

    return {
      type: 'CallExpression',
      callee,
      arguments: args,
      line: callee.line,
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

    if (this.match('KEYWORD', 'for')) {
      return this.parseForStatement();
    }

    // Add support for struct declarations
    if (this.match('KEYWORD', 'struct')) {
      return this.parseStructStatement();
    }

    // Add support for function declaration at statement level:
    if (
      this.match('KEYWORD') &&
      ['void', 'int', 'float', 'string', 'bool'].includes(this.peek().value) &&
      this.tokens[this.current + 1] && this.tokens[this.current + 1].type === 'IDENTIFIER' &&
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
