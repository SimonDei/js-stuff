import { CLanguageParser } from './chevo-parser.js'; // Importiere deine Parser-Klasse

// Die Basis-Visitor-Klasse von Chevrotain.
// Wenn du nicht für jede Regel eine Methode implementieren willst,
// sondern nur für die relevanten, nutze BaseCstVisitorWithDefaults.
const parserInstance = new CLanguageParser(); // Du brauchst eine Instanz für den Visitor
const BaseCstVisitor = parserInstance.getBaseCstVisitorConstructor();

class AstBuilder extends BaseCstVisitor {
  constructor() {
    super();
    // Wichtig: Chevrotain validiert, dass alle Grammatikregeln im Visitor implementiert sind.
    this.validateVisitor();
  }

  // --- Visitor-Methoden für deine Grammatikregeln ---

  program(ctx) {
    const definitions = [];
    if (ctx.typeDefinition) {
      ctx.typeDefinition.forEach(tdCtx => {
        definitions.push(this.visit(tdCtx));
      });
    }
    if (ctx.functionDefinition) {
      ctx.functionDefinition.forEach(fdCtx => {
        definitions.push(this.visit(fdCtx));
      });
    }
    return {
      type: "Program",
      body: definitions
    };
  }

  typeDefinition(ctx) {
    const newType = ctx.newTypeName[0].image;
    let oldType = null;

    const isFunctionPointer = !!ctx.functionPointerParameterList;

    if (!isFunctionPointer) {
      oldType = this.visit(ctx.originalType[0]);
    } else {
      oldType = {
        type: "FunctionPointerType",
        returnType: this.visit(ctx.originalType[0]),
        params: []
      };
      ctx.functionPointerParameterList.forEach(paramCtx => {
        oldType.params.push(this.visit(paramCtx));
      });
    }

    return {
      type: "TypeDefinition",
      newType,
      oldType
    }
  }

  functionDefinition(ctx) {
    let returnType = null;
    ctx.typeSpecifier.forEach(typeCtx => {
      returnType = this.visit(typeCtx);
    });
    const functionName = ctx.Identifier[0].image;
    const parameters = [];
    if (ctx.parameterList) {
      ctx.parameterList.forEach(paramCtx => {
        parameters.push(this.visit(paramCtx));
      });
    }
    const body = [];
    if (ctx.block) {
      ctx.block.forEach(blockCtx => {
        blockCtx.children.statement.forEach(statementCtx => {
          body.push(this.visit(statementCtx));
        });
      });
    }
    return {
      type: "FunctionDeclaration",
      id: { type: "Identifier", name: functionName },
      params: parameters,
      returnType: returnType,
      body: {
        type: "BlockStatement",
        body: body
      }
    };
  }

  typeSpecifier(ctx) {
    const specifier = {
      type: "TypeSpecifier",
      isArray: false,
      name: undefined
    };

    // Die Grammatikregel typeSpecifier enthält OPTION für LBracket/RBracket
    if (ctx.LBracket && ctx.LBracket.length > 0 && ctx.RBracket && ctx.RBracket.length > 0) {
      specifier.isArray = true;
    }

    if (ctx.Int) specifier.name = "int";
    else if (ctx.Float) specifier.name = "float";
    else if (ctx.String) specifier.name = "string";
    // else if (ctx.Bool) specifier.name = "bool"; // 'Bool' ist nicht in Ihrer bereitgestellten Grammatik
    else if (ctx.Void) specifier.name = "void";
    else if (ctx.Auto) specifier.name = "auto"; // Auto hinzugefügt
    else if (ctx.Identifier) {
      specifier.name = ctx.Identifier[0].image;
    }

    return specifier;
  }

  parameterList(ctx) {
    const parameters = [];
    if (ctx.parameter) {
      ctx.parameter.forEach(paramCtx => {
        parameters.push(this.visit(paramCtx));
      });
    }
    return parameters;
  }

  parameter(ctx) {
    let paramName = undefined;
    let paramType = undefined;
    
    if (ctx.Void) {
      paramType = { type: "TypeSpecifier", name: "void" };
    }

    if (ctx.simpleType) {
      if (ctx.simpleType[0].name === 'typeSpecifier') {
        paramType = this.visit(ctx.simpleType[0]);
      }
    }

    if (ctx.simpleName) {
      paramName = ctx.simpleName[0].image;
    }

    if (ctx.pointerName) {
      paramName = ctx.pointerName[0].image;
      const pointerType = this.visit(ctx.returnType[0]);
      
      const params = [];
      if (ctx.functionPointerParameterList) {
        ctx.functionPointerParameterList.forEach(paramCtx => {
          params.push(this.visit(paramCtx));
        });
      }

      paramType = {
        type: "PointerType",
        returnType: pointerType,
        params
      };
    }

    return {
      type: "Parameter",
      name: paramName,
      typeAnnotation: paramType
    };
  }

  block(ctx) {
    if (ctx.statement) {
      const statements = [];
      ctx.statement.forEach(statementCtx => {
        statements.push(this.visit(statementCtx));
      });
      return {
        type: "BlockStatement",
        body: statements
      };
    }
  }

  statement(ctx) {
    if (ctx.variableDeclaration) return this.visit(ctx.variableDeclaration[0]);
    if (ctx.assignmentStatement) return this.visit(ctx.assignmentStatement[0]);
    if (ctx.returnStatement) return this.visit(ctx.returnStatement[0]);
    if (ctx.ifStatement) return this.visit(ctx.ifStatement[0]);
    if (ctx.forStatement) return this.visit(ctx.forStatement[0]);
    if (ctx.expressionStatement) return this.visit(ctx.expressionStatement[0]);
    // Sollte nicht passieren, wenn die Grammatik vollständig ist
    return { type: "UnknownStatement", context: ctx };
  }

  variableDeclaration(ctx) {
    const variableName = ctx.Identifier[0].image;
    const variableType = this.visit(ctx.typeSpecifier[0]);
    let variableValue = undefined;
    if (ctx.expression) {
      variableValue = this.visit(ctx.expression[0]);
    }
    const isConst = !!ctx.Const;
    
    return {
      type: "VariableDeclaration",
      isConst: isConst,
      id: { type: "Identifier", name: variableName },
      varType: variableType,
      init: variableValue
    };
  }

  // --- Ausdrücke (vereinfacht) ---

  expression(ctx) {
    // Da expression direkt zu assignmentExpression geht:
    return this.visit(ctx.assignmentExpression[0]);
  }

  assignmentExpression(ctx) {
    const left = this.visit(ctx.lhs[0]); // lhs ist equalityExpression

    // Prüfen, ob ein Zuweisungsoperator vorhanden ist
    let operator = null;
    if (ctx.Equals) operator = ctx.Equals[0].image;
    else if (ctx.PlusEquals) operator = ctx.PlusEquals[0].image;
    else if (ctx.MinusEquals) operator = ctx.MinusEquals[0].image;

    if (operator && ctx.rhs) { // Nur wenn ein Operator UND eine rechte Seite vorhanden sind
      const right = this.visit(ctx.rhs[0]);
      return {
        type: "AssignmentExpression",
        operator: operator,
        left: left,
        right: right
      };
    }
    
    return left; // Keine Zuweisung, gib den linken Ausdruck (von equalityExpression) zurück
  }

  equalityExpression(ctx) {
    let left = this.visit(ctx.lhs[0]); // lhs ist relationalExpression

    if (ctx.rhs && ctx.rhs.length > 0) { 
      let operatorToken;
      // Bestimme den ersten Operator basierend auf dem vorhandenen Token-Array
      if (ctx.EqualEqual) operatorToken = ctx.EqualEqual[0];
      else if (ctx.NotEqual) operatorToken = ctx.NotEqual[0];

      if (operatorToken) {
        for (let i = 0; i < ctx.rhs.length; i++) {
            // Operator für diese spezifische Operation neu bestimmen, falls die Operatoren in OR wechseln könnten
            // und um sicherzustellen, dass wir den korrekten Operator für die aktuelle rhs-Iteration verwenden.
            let currentOperator;
            if (ctx.EqualEqual && ctx.EqualEqual[i]) currentOperator = ctx.EqualEqual[i].image;
            else if (ctx.NotEqual && ctx.NotEqual[i]) currentOperator = ctx.NotEqual[i].image;
            
            const right = this.visit(ctx.rhs[i]);
            left = { 
                type: "BinaryExpression", 
                operator: currentOperator,
                left: left,
                right: right
            };
        }
        return left;
      }
    }
    return left; 
  }

  // NEUE Visitor-Methode
  logicalAndExpression(ctx) {
    let left = this.visit(ctx.lhs[0]); // lhs ist equalityExpression

    if (ctx.LogicalAnd && ctx.rhs && ctx.rhs.length > 0) {
      for (let i = 0; i < ctx.rhs.length; i++) {
        const right = this.visit(ctx.rhs[i]); // rhs ist equalityExpression
        left = {
          type: "LogicalExpression",
          operator: "&&",
          left: left,
          right: right
        };
      }
    }
    return left;
  }

  // NEUE Visitor-Methode
  logicalOrExpression(ctx) {
    let left = this.visit(ctx.lhs[0]); // lhs ist logicalAndExpression

    if (ctx.LogicalOr && ctx.rhs && ctx.rhs.length > 0) {
      for (let i = 0; i < ctx.rhs.length; i++) {
        const right = this.visit(ctx.rhs[i]); // rhs ist logicalAndExpression
        left = {
          type: "LogicalExpression",
          operator: "||",
          left: left,
          right: right
        };
      }
    }
    return left;
  }

  relationalExpression(ctx) {
    let left = this.visit(ctx.lhs[0]); // lhs ist additiveExpression

    if (ctx.rhs && ctx.rhs.length > 0) {
      let operator = null;
      // Bestimme den ersten Operator
      if (ctx.LessThan) operator = ctx.LessThan[0].image;
      else if (ctx.GreaterThan) operator = ctx.GreaterThan[0].image;
      else if (ctx.LessEqual) operator = ctx.LessEqual[0].image;
      else if (ctx.GreaterEqual) operator = ctx.GreaterEqual[0].image;

      if (operator) {
        for (let i = 0; i < ctx.rhs.length; i++) {
            // Operator für diese spezifische Operation neu bestimmen
            if (ctx.LessThan && ctx.LessThan[i]) operator = ctx.LessThan[i].image;
            else if (ctx.GreaterThan && ctx.GreaterThan[i]) operator = ctx.GreaterThan[i].image;
            else if (ctx.LessEqual && ctx.LessEqual[i]) operator = ctx.LessEqual[i].image;
            else if (ctx.GreaterEqual && ctx.GreaterEqual[i]) operator = ctx.GreaterEqual[i].image;
            
            const right = this.visit(ctx.rhs[i]);
            left = {
                type: "BinaryExpression",
                operator: operator,
                left: left,
                right: right
            };
        }
        return left;
      }
    }
    return left;
  }

  additiveExpression(ctx) {
    let left = this.visit(ctx.lhs[0]); // lhs ist multiplicativeExpression

    if (ctx.rhs && ctx.rhs.length > 0) {
      let operator = null;
      if (ctx.Plus) operator = ctx.Plus[0].image;
      else if (ctx.Minus) operator = ctx.Minus[0].image;
      
      if (operator) {
        for (let i = 0; i < ctx.rhs.length; i++) {
            if (ctx.Plus && ctx.Plus[i]) operator = ctx.Plus[i].image;
            else if (ctx.Minus && ctx.Minus[i]) operator = ctx.Minus[i].image;

            const right = this.visit(ctx.rhs[i]);
            left = {
                type: "BinaryExpression",
                operator: operator,
                left: left,
                right: right
            };
        }
        return left;
      }
    }
    return left;
  }

  multiplicativeExpression(ctx) {
    let left = this.visit(ctx.lhs[0]); // lhs ist unaryExpression

    if (ctx.rhs && ctx.rhs.length > 0) {
      let operator = null;
      if (ctx.Multiply) operator = ctx.Multiply[0].image;
      else if (ctx.Divide) operator = ctx.Divide[0].image;
      // else if (ctx.Modulus) operator = ctx.Modulus[0].image; // Modulus nicht in Ihrem aktuellen AST/Grammatik-Snippet

      if (operator) {
        for (let i = 0; i < ctx.rhs.length; i++) {
            if (ctx.Multiply && ctx.Multiply[i]) operator = ctx.Multiply[i].image;
            else if (ctx.Divide && ctx.Divide[i]) operator = ctx.Divide[i].image;

            const right = this.visit(ctx.rhs[i]);
            left = {
                type: "BinaryExpression",
                operator: operator,
                left: left,
                right: right
            };
        }
        return left;
      }
    }
    return left;
  }

  unaryExpression(ctx) {
    // Grammatik: ++Identifier oder --Identifier oder -unaryExpression oder postfixExpression
    if (ctx.Increment && ctx.Identifier) { // Prefix ++
      return {
        type: "UnaryExpression",
        operator: "++",
        argument: { type: "Identifier", name: ctx.Identifier[0].image },
        prefix: true
      };
    } else if (ctx.Decrement && ctx.Identifier) { // Prefix -- (Identifier2 wegen Suffix in Grammatik)
      return {
        type: "UnaryExpression",
        operator: "--",
        argument: { type: "Identifier", name: ctx.Identifier[0].image },
        prefix: true
      };
    } else if (ctx.Minus && ctx.operand) { // Unäres Minus
      return {
        type: "UnaryExpression",
        operator: "-",
        argument: this.visit(ctx.operand[0]), // operand ist unaryExpression
        prefix: true
      };
    } else if (ctx.postfixExpression) { // Fallback
      return this.visit(ctx.postfixExpression[0]);
    }
    // Sollte nicht erreicht werden, wenn die Grammatik abgedeckt ist
    // Fallback, falls ctx.postfixExpression das einzige Kind ist (was es sein sollte, wenn keine Operatoren zutreffen)
    if (ctx.children && ctx.children.postfixExpression) {
        return this.visit(ctx.children.postfixExpression[0]);
    }
    console.warn("Unbehandelter unaryExpression Fall:", ctx);
    return { type: "UnknownUnaryExpression", context: ctx };
  }

  postfixExpression(ctx) {
    let expression = this.visit(ctx.operand[0]); // operand ist primaryExpression

    // Sammle alle Postfix-Operationen mit ihren Start-Offsets, um die Reihenfolge zu wahren
    const operations = [];
    if (ctx.Dot) {
      ctx.Dot.forEach((op, i) => operations.push({ type: 'Dot', token: op, relatedToken: ctx.memberIdentifier[i], order: op.startOffset }));
    }
    if (ctx.LParen) {
      ctx.LParen.forEach((op, i) => operations.push({ type: 'LParen', token: op, relatedNode: ctx.argumentList ? ctx.argumentList[i] : undefined, order: op.startOffset }));
    }
    if (ctx.Increment) { // Postfix Increment
      ctx.Increment.forEach(op => operations.push({ type: 'Increment', token: op, order: op.startOffset }));
    }
    if (ctx.Decrement) { // Postfix Decrement
      ctx.Decrement.forEach(op => operations.push({ type: 'Decrement', token: op, order: op.startOffset }));
    }
    if (ctx.LBracket) { // Array-Zugriff
      ctx.LBracket.forEach((op, i) => operations.push({ type: 'LBracket', token: op, relatedNode: ctx.indexExpression[i], order: op.startOffset }));
    }

    if (operations.length === 0) {
      return expression; // Keine Postfix-Operationen, gib den Operanden direkt zurück
    }

    // Sortiere die Operationen nach ihrem Auftreten im Quellcode
    operations.sort((a, b) => a.order - b.order);

    for (const opInfo of operations) {
      if (opInfo.type === 'Dot') {
        expression = {
          type: "MemberExpression",
          computed: false,
          object: expression,
          property: { type: "Identifier", name: opInfo.relatedToken.image }
        };
      } else if (opInfo.type === 'LParen') {
        const args = opInfo.relatedNode ? this.visit(opInfo.relatedNode) : [];
        expression = {
          type: "CallExpression",
          callee: expression,
          arguments: args
        };
      } else if (opInfo.type === 'Increment') {
        expression = {
          type: "UnaryExpression",
          operator: "++",
          argument: expression,
          prefix: false
        };
      } else if (opInfo.type === 'Decrement') {
        expression = {
          type: "UnaryExpression",
          operator: "--",
          argument: expression,
          prefix: false
        };
      } else if (opInfo.type === 'LBracket') {
        const indexAst = this.visit(opInfo.relatedNode);
        expression = {
          type: "MemberExpression", // Oder spezifischer "ArrayAccessExpression"
          computed: true,
          object: expression,
          property: indexAst
        };
      }
    }
    return expression;
  }

  primaryExpression(ctx) {
    if (ctx.Number) return { type: "Literal", value: parseFloat(ctx.Number[0].image), raw: ctx.Number[0].image };
    if (ctx.StringLiteral) return { type: "Literal", value: JSON.parse(ctx.StringLiteral[0].image), raw: ctx.StringLiteral[0].image }; // JSON.parse entfernt Anführungszeichen und escaped Chars
    if (ctx.Null) return { type: "Literal", value: null, raw: "null" }; // AST-Knoten für NullLiteral
    if (ctx.Identifier) return { type: "Identifier", name: ctx.Identifier[0].image };
    if (ctx.lambdaExpression) return this.visit(ctx.lambdaExpression[0]); // Lambda-Ausdruck besuchen
    if (ctx.arrayLiteral) return this.visit(ctx.arrayLiteral[0]);
    if (ctx.objectLiteral) return this.visit(ctx.objectLiteral[0]); // NEU: Objekt-Literal besuchen
    if (ctx.LParen) return this.visit(ctx.expression[0]); // Geklammerter Ausdruck

    return { type: "UnknownPrimaryExpression", context: ctx };
  }

  lambdaExpression(ctx) {
    // Capture-Klausel wird derzeit in der Grammatik nicht detailliert geparst,
    // daher wird sie hier auch nicht im AST abgebildet.
    // LBracket und RBracket für Capture sind vorhanden.

    let params = [];
    if (ctx.lambdaParameters && ctx.lambdaParameters[0]) {
      // ctx.lambdaParameters[0] ist der CST-Knoten für 'parameterList'
      params = this.visit(ctx.lambdaParameters[0]);
    }

    let body;
    if (ctx.lambdaBody && ctx.lambdaBody[0]) {
      // ctx.lambdaBody[0] ist der CST-Knoten für 'block'
      body = this.visit(ctx.lambdaBody[0]);
    } else {
      // Fallback oder Fehlerbehandlung, falls kein Body vorhanden ist (sollte durch Grammatik nicht passieren)
      body = { type: "BlockStatement", body: [] };
    }

    return {
      type: "LambdaExpression", // Oder "ArrowFunctionExpression" je nach Konvention
      params: params, // Sollte ein Array von Parameter-AST-Knoten sein
      body: body      // Sollte ein BlockStatement-AST-Knoten sein
      // async: false, // Lambdas sind in C++-Syntax typischerweise nicht async per se
      // expression: false, // C++ Lambdas haben immer einen Block-Body {}
    };
  }

  arrayLiteral(ctx) {
    let elements = [];
    if (ctx.argumentList && ctx.argumentList[0]) {
      // this.visit(ctx.argumentList[0]) sollte ein Array von AST-Knoten zurückgeben
      elements = this.visit(ctx.argumentList[0]);
    }
    return {
      type: "ArrayLiteral", // Oder "ArrayExpression" je nach Konvention
      elements: elements
    };
  }

  // NEUE Visitor-Methode für Objekt-Literale
  objectLiteral(ctx) {
    const properties = [];
    if (ctx.objectProperty) {
      ctx.objectProperty.forEach(propCtx => {
        properties.push(this.visit(propCtx));
      });
    }
    return {
      type: "ObjectLiteral", // Oder "ObjectExpression"
      properties: properties
    };
  }

  // NEUE Visitor-Methode für Objekt-Eigenschaften
  objectProperty(ctx) {
    // ctx.key ist ein Array von Token-Objekten, da es von CONSUME(Identifier, { LABEL: "key" }) kommt
    const keyIdentifier = { type: "Identifier", name: ctx.key[0].image };
    // ctx.value ist ein Array von CST-Knoten, da es von SUBRULE(this.expression, { LABEL: "value" }) kommt
    const valueExpression = this.visit(ctx.value[0]);

    return {
      type: "ObjectProperty", // Oder "Property"
      key: keyIdentifier,
      value: valueExpression,
      // kind: "init" // optional für ESTree-Kompatibilität
    };
  }

  argumentList(ctx) {
    const args = [];
    if (ctx.expression) {
      ctx.expression.forEach(expCtx => {
        args.push(this.visit(expCtx));
      });
    }
    return args; // Gibt ein Array von AST-Knoten zurück
  }

  functionCall(ctx) {
    // Implementierung für Funktionsaufrufe, falls benötigt
    // Beispiel:
    // const callee = { type: "Identifier", name: ctx.Identifier[0].image };
    // const args = ctx.argumentList ? this.visit(ctx.argumentList[0]) : [];
    // return {
    //   type: "CallExpression",
    //   callee: callee,
    //   arguments: args
    // };
    return null; // Platzhalter
  }

  ifStatement(ctx) {
    const test = this.visit(ctx.expression[0]);
    const consequent = this.visit(ctx.thenBlock[0]); // 'thenBlock' ist das Label aus der Grammatik
    let alternate = null;

    if (ctx.Else) { // Prüfen, ob ein Else-Zweig vorhanden ist
      if (ctx.elseIfStatement) { // Prüfen auf 'else if'
        alternate = this.visit(ctx.elseIfStatement[0]); // 'elseIfStatement' ist das Label
      } else if (ctx.elseBlock) { // Prüfen auf 'else' mit Block
        alternate = this.visit(ctx.elseBlock[0]); // 'elseBlock' ist das Label
      }
    }

    return {
      type: "IfStatement",
      test: test,
      consequent: consequent,
      alternate: alternate
    };
  }

  forStatement(ctx) {
    let init = null;
    // Prüfen, ob der Initialisierungsteil eine Deklaration ist
    if (ctx.typeSpecifier) {
        const varType = this.visit(ctx.typeSpecifier[0]);
        const name = ctx.Identifier[0].image;
        let initialization = null;
        // Wenn es eine Deklaration ist UND eine initExpression vorhanden ist
        if (ctx.initExpression && ctx.initExpression[0]) {
            initialization = this.visit(ctx.initExpression[0]);
        }
        init = {
            type: "VariableDeclaration",
            isConst: !!ctx.Const,
            id: { type: "Identifier", name: name },
            varType: varType,
            init: initialization
        };
    } else if (ctx.initExpression && ctx.initExpression[0]) {
        // Wenn es keine Deklaration ist, aber eine initExpression vorhanden ist
        init = this.visit(ctx.initExpression[0]);
    }

    let test = null;
    if (ctx.testExpression && ctx.testExpression[0]) {
        test = this.visit(ctx.testExpression[0]);
    }

    let update = null;
    if (ctx.updateExpression && ctx.updateExpression[0]) {
        update = this.visit(ctx.updateExpression[0]);
    }

    const body = this.visit(ctx.block[0]);

    return {
      type: "ForStatement",
      init: init,
      test: test,
      update: update,
      body: body
    };
  }

  returnStatement(ctx) {
    let argument = null;
    if (ctx.expression && ctx.expression[0]) {
      argument = this.visit(ctx.expression[0]);
    }
    return {
      type: "ReturnStatement",
      argument: argument
    };
  }

  assignmentStatement(ctx) {
    // Diese Regel ist für `Identifier AssignOp expression;`
    // z.B. `a = 10;` oder `b += 5;`
    // Wenn Ihre Grammatik Zuweisungen wie `c += 10` als expressionStatement behandelt,
    // dann wird diese Methode möglicherweise nicht für alle Zuweisungen aufgerufen.
    if (ctx.Identifier && ctx.expression) {
        const left = { type: "Identifier", name: ctx.Identifier[0].image };
        let operator;
        if (ctx.Equals) operator = ctx.Equals[0].image;
        else if (ctx.PlusEquals) operator = ctx.PlusEquals[0].image;
        else if (ctx.MinusEquals) operator = ctx.MinusEquals[0].image;
        // Fügen Sie hier andere Zuweisungsoperatoren hinzu, falls vorhanden

        const right = this.visit(ctx.expression[0]);

        return {
            type: "ExpressionStatement", // Oft werden solche Anweisungen als ExpressionStatement mit einer AssignmentExpression darin dargestellt
            expression: {
                type: "AssignmentExpression",
                operator: operator,
                left: left,
                right: right
            }
        };
    }
    return null; // Platzhalter
  }

  expressionStatement(ctx) {
    if (ctx.expression && ctx.expression[0]) {
      const expressionNode = this.visit(ctx.expression[0]);
      // Verhindern, dass leere oder problematische Ausdrücke zu `null` im AST führen
      if (expressionNode) {
        return {
          type: "ExpressionStatement",
          expression: expressionNode
        };
      }
    }
    return null; // Oder eine spezifischere Behandlung für leere Statements
  }
}

// Exportiere den Builder, um ihn in deiner Hauptdatei zu verwenden
export const astBuilder = new AstBuilder();
