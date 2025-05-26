import { CLanguageParser } from './chevro-parser.js'; // Importiere deine Parser-Klasse

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

   // Hilfsmethode, um den Start-Offset eines CST-Knotens zu ermitteln
  _getStartOffsetOfCstNode(cstNode) {
    let minOffset = Infinity;
    let foundToken = false;

    function findMinOffsetRecursive(children) {
      for (const key in children) {
        const childArray = children[key];
        if (childArray) {
          for (const item of childArray) {
            // Prüfen, ob es sich um ein Token-Objekt handelt (hat typischerweise startOffset)
            if (item && typeof item.startOffset === 'number') {
              minOffset = Math.min(minOffset, item.startOffset);
              foundToken = true;
            } else if (item && item.name && item.children) { // Es ist ein verschachtelter CST-Knoten (CST einer Sub-Regel)
              findMinOffsetRecursive(item.children);
            }
          }
        }
      }
    }

    if (cstNode && cstNode.children) {
      findMinOffsetRecursive(cstNode.children);
    }
    // Wenn keine Tokens gefunden wurden (z.B. leere Regel), aber der Knoten selbst von einer Regel stammt,
    // die Tokens konsumiert hat, die nicht direkt im `children` des aktuellen `cstNode` sind,
    // könnte dieser Ansatz verfeinert werden müssen. Für die meisten Fälle sollte es jedoch funktionieren.
    // Im schlimmsten Fall, wenn ein Knoten keine Tokens hat, gibt er Infinity zurück, was ihn ans Ende sortiert (oder je nach Logik).
    return foundToken ? minOffset : Infinity;
  }

  // --- Visitor-Methoden für deine Grammatikregeln ---

  program(ctx) {
    const allCstItemsWithOffset = [];

    // Liste der Namen der Top-Level-Regeln, wie sie im Parser-Kontext (ctx) erscheinen
    const topLevelRuleArrays = ["typeDefinition", "functionDefinition", "variableDeclaration", "expressionStatement"];

    for (const ruleArrayName of topLevelRuleArrays) {
      if (ctx[ruleArrayName]) {
        ctx[ruleArrayName].forEach(cstNode => {
          // cstNode ist hier der CST für eine spezifische Regelinstanz
          // (z.B. eine functionDefinition, eine variableDeclaration etc.)
          allCstItemsWithOffset.push({
            cst: cstNode, // Der eigentliche CST-Knoten, der besucht werden soll
            startOffset: this._getStartOffsetOfCstNode(cstNode)
          });
        });
      }
    }

    // Sortiere die gesammelten CST-Knoten nach ihrem Start-Offset
    allCstItemsWithOffset.sort((a, b) => a.startOffset - b.startOffset);

    const programBodyAst = [];
    allCstItemsWithOffset.forEach(item => {
      const astNode = this.visit(item.cst);
      if (astNode) { // Füge den AST-Knoten nur hinzu, wenn er nicht null ist
        programBodyAst.push(astNode);
      }
    });

    return {
      type: "Program",
      body: programBodyAst
    };
  }

  typeDefinition(ctx) {
    const newType = ctx.newTypeName[0].image;
    let oldTypeNode = null; // Wird der AST-Knoten für den alten Typ sein

    // Prüfen, ob der ursprüngliche Typ als const markiert wurde
    const isOriginalTypeConst = !!(ctx.isOriginalTypeConst && ctx.isOriginalTypeConst.length > 0);

    const isFunctionPointer = !!ctx.functionPointerParameterList; // Besser: Prüfen auf LParen nach originalType oder spezifische Struktur

    if (!isFunctionPointer) {
      oldTypeNode = this.visit(ctx.originalType[0]);
      // Füge die const-Information zum TypeSpecifier-Knoten hinzu, falls vorhanden
      if (oldTypeNode.type === "TypeSpecifier") {
        oldTypeNode.isConst = isOriginalTypeConst; // Neue Eigenschaft
      }
    } else {
      const returnTypeAst = this.visit(ctx.originalType[0]);
      if (returnTypeAst.type === "TypeSpecifier") {
        returnTypeAst.isConst = isOriginalTypeConst; // Const-Info zum Rückgabetyp
      }
      oldTypeNode = {
        type: "FunctionPointerType",
        returnType: returnTypeAst,
        params: []
      };
      if (ctx.functionPointerParameterList && ctx.functionPointerParameterList[0]) {
        oldTypeNode.params = this.visit(ctx.functionPointerParameterList[0]);
      }
      // Ein FunctionPointerType selbst kann auch als const betrachtet werden,
      // basierend auf dem `isOriginalTypeConst` vor dem gesamten Funktionszeiger-Typ.
      oldTypeNode.isConst = isOriginalTypeConst; // Neue Eigenschaft
    }

    return {
      type: "TypeDefinition",
      newType,
      oldType: oldTypeNode // oldType ist jetzt der AST-Knoten
    };
  }

  functionDefinition(ctx) {
    let returnType = null;
    // Annahme: typeSpecifier ist immer vorhanden und eindeutig für eine Funktionsdefinition gemäß Grammatik
    if (ctx.typeSpecifier && ctx.typeSpecifier.length > 0) {
        returnType = this.visit(ctx.typeSpecifier[0]);
    }

    const functionName = ctx.Identifier[0].image;
    
    let parameters = []; // Standardmäßig ein leeres Array
    if (ctx.parameterList && ctx.parameterList.length > 0) {
      // ctx.parameterList[0] ist der CST-Knoten für die 'parameterList'-Regel.
      // this.visit(ctx.parameterList[0]) ruft den 'parameterList'-Visitor auf,
      // der ein flaches Array von Parameter-AST-Knoten zurückgibt.
      parameters = this.visit(ctx.parameterList[0]);
    }

    let functionBodyAst;
    let isArrowExpressionBody = false;

    if (ctx.Arrow && ctx.expression && ctx.expression.length > 0) {
      // Arrow-Funktion mit einem Expression-Body
      functionBodyAst = this.visit(ctx.expression[0]);
      isArrowExpressionBody = true;
    } else if (ctx.block && ctx.block.length > 0) {
      // Reguläre Funktion mit einem Block-Body
      functionBodyAst = this.visit(ctx.block[0]); // this.visit(blockCtx) gibt einen BlockStatement-AST zurück
    } else {
      // Sollte basierend auf der Grammatik nicht passieren (functionDefinition erfordert entweder Block oder Arrow+Expression)
      // Als Fallback einen leeren Block erstellen.
      functionBodyAst = { type: "BlockStatement", body: [] };
      console.warn("Funktionsdefinition ohne korrekten Body:", ctx);
    }

    return {
      type: "FunctionDeclaration",
      id: { type: "Identifier", name: functionName },
      params: parameters, // Ist jetzt ein flaches Array von Parameter-ASTs
      returnType: returnType,
      body: functionBodyAst, // Kann entweder eine Expression oder ein BlockStatement sein
      expression: isArrowExpressionBody // true, wenn Body eine Expression ist, false, wenn BlockStatement
    };
  }

  typeSpecifier(ctx) {
    const specifier = {
      type: "TypeSpecifier",
      name: undefined,
      isBaseTypeNullable: !!(ctx.isBaseTypeNullable && ctx.isBaseTypeNullable.length > 0), // NEU
      isArray: !!(ctx.isArrayDeclaration && ctx.isArrayDeclaration.length > 0),
      isArrayItselfNullable: !!(ctx.isArrayItselfNullable && ctx.isArrayItselfNullable.length > 0) // NEU
    };

    // Die Grammatikregel typeSpecifier enthält OPTION für LBracket/RBracket
    if (ctx.LBracket && ctx.LBracket.length > 0 && ctx.RBracket && ctx.RBracket.length > 0) {
      specifier.isArray = true;
    }

    if (ctx.Int) specifier.name = "int";
    else if (ctx.Float) specifier.name = "float";
    else if (ctx.String) specifier.name = "string";
    else if (ctx.Bool) specifier.name = "bool";
    else if (ctx.Void) specifier.name = "void";
    else if (ctx.Auto) specifier.name = "auto"; // Auto hinzugefügt
    else if (ctx.Identifier) {
      specifier.name = ctx.Identifier[0].image;
    }

    return specifier;
  }

  parameterList(ctx) {
    const parameters = [];
    if (ctx.parameter) { // ctx.parameter ist ein Array von 'parameter' CST-Knoten
      ctx.parameter.forEach(paramCtx => {
        parameters.push(this.visit(paramCtx)); // this.visit(paramCtx) gibt einen einzelnen Parameter-AST-Knoten zurück
      });
    }
    return parameters; // Gibt ein flaches Array von Parameter-AST-Knoten zurück
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
    const statements = [];
    if (ctx.statement) { // ctx.statement ist ein Array von statement CST-Knoten
      ctx.statement.forEach(statementCtx => {
        statements.push(this.visit(statementCtx));
      });
    }
    return {
      type: "BlockStatement",
      body: statements // Dies ist ein leeres Array, wenn ctx.statement nicht vorhanden war
    };
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

  nullishCoalescingExpression(ctx) {
    let left = this.visit(ctx.lhs[0]); // lhs ist logicalOrExpression

    if (ctx.NullishCoalescing && ctx.rhs && ctx.rhs.length > 0) {
      for (let i = 0; i < ctx.rhs.length; i++) {
        const right = this.visit(ctx.rhs[i]); // rhs ist logicalOrExpression
        left = {
          type: "LogicalExpression", // Bleibt LogicalExpression, nur der Operator ändert sich
          operator: "??",
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
    // Grammatik: ++Identifier oder --Identifier oder -unaryExpression oder postfixExpression oder !unaryExpression
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
    } else if (ctx.Not && ctx.operand) { // NEU: Logical NOT
      return {
        type: "UnaryExpression",
        operator: "!",
        argument: this.visit(ctx.operand[0]),
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
      // Stellen Sie sicher, dass memberIdentifier für Dot existiert und die gleiche Länge hat
      ctx.Dot.forEach((op, i) => {
        if (ctx.memberIdentifier && ctx.memberIdentifier[i]) {
          operations.push({ type: 'Dot', token: op, relatedToken: ctx.memberIdentifier[i], order: op.startOffset });
        } else if (ctx.memberIdentifier && ctx.memberIdentifier.length > i && ctx.memberIdentifier[i].name === "memberIdentifier") {
          // Fall für ctx.memberIdentifier als Array von Identifier-Tokens (wenn mehrere Dot-Operationen vorhanden sind)
          operations.push({ type: 'Dot', token: op, relatedToken: ctx.memberIdentifier[i], order: op.startOffset });
        }
      });
    }
    // NEU: OptionalChaining behandeln
    if (ctx.OptionalChaining) {
      ctx.OptionalChaining.forEach((op, i) => {
        // Finde das zugehörige memberIdentifier. Es könnte in einem separaten Array sein oder im selben, je nach Grammatik.
        // Annahme: Wenn OptionalChaining existiert, gibt es auch ein zugehöriges memberIdentifier.
        // Die Logik hier muss möglicherweise angepasst werden, je nachdem, wie Chevrotain die Labels bei mehreren Vorkommen handhabt.
        // Wenn ctx.memberIdentifier alle Identifier sammelt (sowohl für Dot als auch für OptionalChaining),
        // dann muss die Zuordnung sorgfältiger erfolgen, z.B. über die Reihenfolge oder spezifische Labels.
        // Fürs Erste nehmen wir an, dass es ein separates Array oder eine korrekte Indexierung gibt.
        // Wenn `memberIdentifier` für `Dot` und `OptionalChaining` dasselbe Label hat,
        // muss man die Tokens sorgfältig zuordnen. Chevrotain erstellt Arrays für jedes Label.
        // Wenn `Dot` und `OptionalChaining` auftreten, hat `memberIdentifier` möglicherweise Einträge von beiden.
        // Wir müssen die Tokens basierend auf ihrer Position oder durch Iterieren über alle Operationen zuordnen.

        // Einfachere Annahme: Wenn ctx.OptionalChaining[i] existiert, dann ctx.memberIdentifier[i] (oder eine andere Indexlogik)
        // ist der zugehörige Identifier. Dies hängt davon ab, wie Chevrotain die Arrays füllt.
        // Wenn `CONSUME(Identifier, { LABEL: "memberIdentifier" })` und `CONSUME2(Identifier, { LABEL: "memberIdentifier" })`
        // in dasselbe `ctx.memberIdentifier`-Array schreiben, ist die Zuordnung komplex.
        // Besser wäre es, wenn `CONSUME2` ein `ctx.memberIdentifier2` erzeugen würde oder ein anderes Label.
        // Da wir `memberIdentifier` für beide verwenden, müssen wir die Tokens sorgfältig zuordnen.
        // Die aktuelle Grammatik verwendet `CONSUME(Identifier, { LABEL: "memberIdentifier" })` für OptionalChaining
        // und `CONSUME2(Identifier, { LABEL: "memberIdentifier" })` für Dot.
        // Das bedeutet, `ctx.memberIdentifier` enthält die Identifier für OptionalChaining
        // und `ctx.memberIdentifier2` (falls vorhanden und so von Chevrotain benannt) für Dot.
        // Oder Chevrotain fasst sie unter `ctx.memberIdentifier` zusammen und man muss sie über die `tokenTypeIdx` oder Offsets unterscheiden.

        // Korrigierte Annahme basierend auf der Grammatik:
        // OptionalChaining verwendet `CONSUME(Identifier, { LABEL: "memberIdentifier" })`
        // Dot verwendet `CONSUME2(Identifier, { LABEL: "memberIdentifier" })`
        // Dies sollte zu `ctx.memberIdentifier` (für OptionalChaining) und `ctx.memberIdentifier2` (für Dot) führen.
        // Wenn Chevrotain sie jedoch unter demselben Label zusammenfasst, wird es komplizierter.
        // Wir gehen davon aus, dass `ctx.memberIdentifier` für `OptionalChaining` gilt und `ctx.memberIdentifier2` für `Dot`.
        // Wenn `CONSUME2` nicht zu einem separaten Array führt, muss die Logik hier angepasst werden.
        // Die Grammatik hat:
        // OptionalChaining: this.CONSUME(Identifier, { LABEL: "memberIdentifier" });
        // Dot: this.CONSUME2(Identifier, { LABEL: "memberIdentifier" });
        // Chevrotain wird wahrscheinlich `ctx.memberIdentifier` als Array haben, das Tokens von beiden enthält,
        // oder es wird `ctx.memberIdentifier` und `ctx.memberIdentifier$2` (oder ähnlich) erstellen.
        // Wir müssen prüfen, wie Chevrotain das handhabt.
        // Fürs Erste nehmen wir an, dass `ctx.memberIdentifier` alle relevanten Identifier enthält und wir sie
        // den `OptionalChaining`-Tokens zuordnen können.

        // Da `Dot` `CONSUME2` ein anderes Array erzeugt (z.B. memberIdentifier2)
        // Und `OptionalChaining` verwendet `CONSUME`, also `ctx.memberIdentifier`.
        if (ctx.memberIdentifier && ctx.memberIdentifier[i]) {
            operations.push({ type: 'OptionalChaining', token: op, relatedToken: ctx.memberIdentifier[i], order: op.startOffset });
        }
      });
    }
    // Anpassung für Dot, falls CONSUME2 ein anderes Array erzeugt (z.B. memberIdentifier2)
    // Wenn `CONSUME2(Identifier, { LABEL: "memberIdentifier" })` zu `ctx.memberIdentifier` (Array) führt,
    // dann müssen wir die Tokens anders zuordnen.
    // Die aktuelle Implementierung von `Dot` oben geht davon aus, dass `ctx.memberIdentifier` die Tokens für `Dot` enthält.
    // Wenn `OptionalChaining` `CONSUME` und `Dot` `CONSUME2` mit demselben Label verwenden,
    // wird Chevrotain sie wahrscheinlich in `ctx.memberIdentifier` zusammenfassen.
    // Wir müssen die Logik zur Zuordnung der `relatedToken` überarbeiten.

    // Überarbeitete Logik für Operationen-Sammlung:
    operations.length = 0; // Array leeren und neu befüllen
    let memberIndex = 0;
    let member2Index = 0;

    // Alle potenziellen Operationen sammeln und dann sortieren
    const allOpsRaw = [];
    if (ctx.OptionalChaining) {
        ctx.OptionalChaining.forEach(op => allOpsRaw.push({type: 'OptionalChaining', opToken: op, order: op.startOffset}));
    }
    if (ctx.Dot) {
        ctx.Dot.forEach(op => allOpsRaw.push({type: 'Dot', opToken: op, order: op.startOffset}));
    }
    if (ctx.LParen) {
      ctx.LParen.forEach((op, i) => allOpsRaw.push({ type: 'LParen', opToken: op, relatedNode: ctx.argumentList ? ctx.argumentList[i] : undefined, order: op.startOffset }));
    }
    if (ctx.Increment) { // Postfix Increment
      ctx.Increment.forEach(op => allOpsRaw.push({ type: 'Increment', opToken: op, order: op.startOffset }));
    }
    if (ctx.Decrement) { // Postfix Decrement
      ctx.Decrement.forEach(op => allOpsRaw.push({ type: 'Decrement', opToken: op, order: op.startOffset }));
    }
    if (ctx.LBracket) { // Array-Zugriff
      ctx.LBracket.forEach((op, i) => allOpsRaw.push({ type: 'LBracket', opToken: op, relatedNode: ctx.indexExpression[i], order: op.startOffset }));
    }

    allOpsRaw.sort((a, b) => a.order - b.order);

    // Jetzt die Identifier zuordnen
    // `memberIdentifier` ist für `OptionalChaining` (CONSUME) und `Dot` (CONSUME2)
    // Chevrotain wird `ctx.memberIdentifier` als Array aller Tokens mit diesem Label erstellen.
    // Wir müssen sie in der Reihenfolge ihres Auftretens zuordnen.
    let currentMemberIdentifierIndex = 0;
    for (const rawOp of allOpsRaw) {
        if (rawOp.type === 'OptionalChaining' || rawOp.type === 'Dot') {
            if (ctx.memberIdentifier && ctx.memberIdentifier[currentMemberIdentifierIndex]) {
                operations.push({ ...rawOp, relatedToken: ctx.memberIdentifier[currentMemberIdentifierIndex] });
                currentMemberIdentifierIndex++;
            }
        } else {
            operations.push(rawOp);
        }
    }


    if (operations.length === 0) {
      return expression; // Keine Postfix-Operationen, gib den Operanden direkt zurück
    }

    // Sortiere die Operationen nach ihrem Auftreten im Quellcode (bereits oben geschehen)
    // operations.sort((a, b) => a.order - b.order); // Nicht mehr nötig

    for (const opInfo of operations) {
      if (opInfo.type === 'Dot') {
        expression = {
          type: "MemberExpression",
          computed: false,
          object: expression,
          property: { type: "Identifier", name: opInfo.relatedToken.image },
          optional: false // Standardmäßig nicht optional
        };
      } else if (opInfo.type === 'OptionalChaining') { // NEU
        expression = {
          type: "MemberExpression",
          computed: false,
          object: expression,
          property: { type: "Identifier", name: opInfo.relatedToken.image },
          optional: true // Ist optional
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
    if (ctx.StringLiteral) {
      const rawImage = ctx.StringLiteral[0].image;
      // Entferne die äußeren Anführungszeichen (entweder ' oder ")
      const stringValue = rawImage.substring(1, rawImage.length - 1);
      
      // Bereite den String-Inhalt für JSON.parse vor:
      // 1. Ersetze Backslashes durch doppelte Backslashes.
      // 2. Ersetze doppelte Anführungszeichen durch escapete doppelte Anführungszeichen.
      // 3. Konvertiere literale Steuerzeichen (wie Zeilenumbruch, Tab) in ihre Escape-Sequenzen.
      const jsonParsableString = stringValue
        .replace(/\\/g, '\\\\')  // \ -> \\
        .replace(/"/g, '\\"')    // " -> \"
        .replace(/\n/g, '\\n')   // Literal LF -> \n Sequenz
        .replace(/\r/g, '\\r')   // Literal CR -> \r Sequenz
        .replace(/\t/g, '\\t')   // Literal Tab -> \t Sequenz
        .replace(/\f/g, '\\f')   // Literal FormFeed -> \f Sequenz
        // Einfache Anführungszeichen (') müssen für JSON.parse nicht escaped werden, wenn der äußere String mit (") umschlossen ist.

      let unescapedValue;
      try {
        // Umschließe den vorbereiteten String mit doppelten Anführungszeichen, um einen gültigen JSON-String zu bilden, und parse ihn.
        unescapedValue = JSON.parse(`"${jsonParsableString}"`);
      } catch (e) {
        // Dieser Fall sollte idealerweise nicht eintreten, wenn jsonParsableString korrekt formatiert wurde.
        // Ein Fehler hier deutet auf ein Problem in der obigen Escaping-Logik oder einen sehr ungewöhnlichen String hin.
        console.error(
          "Fehler beim Parsen des String-Literals nach der Vorbereitung für JSON.parse. Dies sollte nicht passieren.",
          { raw: rawImage, prepared: jsonParsableString, error: e }
        );
        // Fallback auf eine einfachere (weniger umfassende) Unescaping-Methode.
        // Diese behandelt die häufigsten Escapes, aber nicht alle, die JSON.parse könnte.
        // Literale Zeilenumbrüche in stringValue bleiben hier als literale Zeilenumbrüche erhalten.
        unescapedValue = stringValue
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\f/g, '\f')
          .replace(/\\'/g, "'")
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      }

      return { type: "Literal", value: unescapedValue, raw: rawImage };
    }
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
    // außer dem optionalen Ampersand.
    const hasAmpersandCapture = !!ctx.captureAmpersand; // Prüfen, ob das Ampersand-Token konsumiert wurde

    let params = [];
    if (ctx.lambdaParameters && ctx.lambdaParameters[0]) {
      // ctx.lambdaParameters[0] ist der CST-Knoten für 'parameterList'
      params = this.visit(ctx.lambdaParameters[0]);
    }

    let returnType = null; // Initialisieren mit null
    if (ctx.lambdaReturnType && ctx.lambdaReturnType[0]) {
      returnType = this.visit(ctx.lambdaReturnType[0]);
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
      hasAmpersandCapture: hasAmpersandCapture, // NEUE Eigenschaft
      returnType: returnType, // Hinzugefügter optionaler Rückgabetyp
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
    // Prüfen, ob es eine foreach-Schleife ist (basierend auf den geparsten Elementen)
    if (ctx.Colon) { // Eindeutiges Zeichen für die foreach-Variante
      const loopVarType = this.visit(ctx.loopVariableType[0]);
      const loopVarName = ctx.loopVariable[0].image;
      const iterable = this.visit(ctx.iterableExpression[0]);
      const body = this.visit(ctx.block[0]);
      // const isConst = !!ctx.isConst; // Bisherige Prüfung
      // Explizitere Prüfung, ob die gelabelte OPTION 'isConst' im Parser als 'true' ausgewertet wurde.
      // Wenn OPTION({LABEL: 'isConst', ...}) genommen wurde, ist ctx.isConst === true.
      // Wenn nicht, ist ctx.isConst === undefined.
      const isConst = !!ctx.Const;

      return {
        type: "ForEachStatement", // Neuer AST-Knotentyp
        isConst: isConst, // Diese Eigenschaft auf ForEachStatement ist für den Generator nicht direkt relevant
        left: { // Die linke Seite der 'of'-Deklaration
          type: "VariableDeclaration", // Kann als eine Art Mini-Deklaration gesehen werden
          isConst: isConst, // Diese Eigenschaft wird vom Code-Generator verwendet
          id: { type: "Identifier", name: loopVarName },
          varType: loopVarType, // Typinformation für die Schleifenvariable
          init: null // Keine direkte Initialisierung hier
        },
        right: iterable, // Der Ausdruck, über den iteriert wird
        body: body
      };
    } else { // C-Style for-Schleife
      let init = null;
      if (ctx.initVarType) { // Deklaration im Initializer
        const varType = this.visit(ctx.initVarType[0]);
        const name = ctx.initVarName[0].image;
        let initialization = null;
        if (ctx.initExpression && ctx.initExpression[0]) {
          initialization = this.visit(ctx.initExpression[0]);
        }
        init = {
          type: "VariableDeclaration",
          isConst: !!(ctx.Const && ctx.Const.find(c => c.startOffset < ctx.initVarType[0].startOffset)), // Prüfen ob Const vor dem Typ steht
          id: { type: "Identifier", name: name },
          varType: varType,
          init: initialization
        };
      } else if (ctx.initExpression && ctx.initExpression[0]) {
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
      if (expressionNode) {
        return {
          type: "ExpressionStatement",
          expression: expressionNode
        };
      }
    }
    return null; // Kann null zurückgeben, wenn kein gültiger Ausdruck gefunden wurde
  }
}

// Exportiere den Builder, um ihn in deiner Hauptdatei zu verwenden
export const astBuilder = new AstBuilder();
