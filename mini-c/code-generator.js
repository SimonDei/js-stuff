export default class CodeGenerator {
  constructor() {
    this.indentationLevel = 0; // Track the current indentation level
    this.userDefinedStructs = new Map(); // Track user-defined structs
  }

  indent() {
    return '  '.repeat(this.indentationLevel); // 2 spaces per level
  }

  generate(node) {
    if (!node) return ""; // Guard against null or undefined nodes

    switch (node.type) {
      case 'Program': // Programme werden typischerweise außerhalb iteriert
        return node.body.map(n => this.generate(n)).join('\n\n');
      case 'FunctionDeclaration':
        return this.generateFunctionDeclaration(node);
      case 'VariableDeclaration':
        return this.generateVariableDeclaration(node);
      case 'ReturnStatement':
        return this.generateReturnStatement(node);
      case 'IfStatement':
        return this.generateIfStatement(node);
      case 'ForStatement': // Behalten, falls es später verwendet wird
        return this.generateForStatement(node);
      case 'ForEachStatement': // NEUER CASE
        return this.generateForEachStatement(node);
      case 'ExpressionStatement':
        return this.generateExpressionStatement(node);
      case 'BinaryExpression':
        return this.generateBinaryExpression(node);
      case 'UnaryExpression':
        return this.generateUnaryExpression(node);
      case 'MemberExpression':
        return this.generateMemberExpression(node);
      case 'AssignmentExpression':
        return this.generateAssignmentExpression(node);
      case 'Literal': // Ersetzt NumericLiteral und StringLiteral
        return this.generateLiteral(node);
      case 'Identifier':
        return this.generateIdentifier(node);
      case 'CallExpression':
        return this.generateCallExpression(node);
      case 'LambdaExpression':
        return this.generateLambdaExpression(node);
      case 'ObjectLiteral': // NEU
        return this.generateObjectLiteral(node);
      case 'ArrayLiteral': // NEU
        return this.generateArrayLiteral(node);
      // Entfernt: StructDeclaration, StructInitialization, NumericLiteral, StringLiteral
      case 'LogicalExpression': // NEU
        return this.generateLogicalExpression(node);
      case 'TypeDefinition': // NEU
        return this.generateTypeDefinition(node);
      default:
        console.warn(`Unknown AST node type: ${node.type}`, node);
        // throw new Error(`Unknown node type: ${node.type}`);
        return `// Unknown node type: ${node.type}`; // Sanfterer Fehler für unbekannte Typen
    }
  }

  // Hilfsfunktion zum Mappen von C-Typen zu JSDoc-Typen
  mapCTypeToJsDoc(cTypeName) {
    if (!cTypeName) return "any";
    switch (cTypeName) {
      case "int":
      case "float":
        return "number";
      case "string":
        return "string";
      case "bool":
        return "boolean";
      case "void":
        return "void";
      default:
        return cTypeName; // Für benutzerdefinierte Typen wie 'Event', 'Element'
    }
  }

  // Hilfsfunktion, um einen TypeSpecifier AST-Knoten in einen JSDoc String umzuwandeln
  generateJsDocTypeFromSpecifier(typeSpecifierNode) {
    if (!typeSpecifierNode || !typeSpecifierNode.name) return "any";

    let jsDocType = this.mapCTypeToJsDoc(typeSpecifierNode.name);

    if (typeSpecifierNode.isBaseTypeNullable) {
      jsDocType = `${jsDocType}|null`;
    }

    if (typeSpecifierNode.isArray) {
      jsDocType = `Array<${jsDocType}>`;
      if (typeSpecifierNode.isArrayItselfNullable) {
        jsDocType = `${jsDocType}|null`;
      }
    }
    return jsDocType;
  }

  generateAssignmentExpression(node) {
    const left = this.generate(node.left);
    const right = this.generate(node.right);
    return `${left} ${node.operator} ${right}`;
  }

  generateTypeDefinition(node) {
    const newTypeName = node.newType;
    let oldTypeString = "any"; // Fallback

    if (node.oldType.type === "TypeSpecifier") {
      oldTypeString = this.generateJsDocTypeFromSpecifier(node.oldType);
    } else if (node.oldType.type === "FunctionPointerType") {
      const returnTypeNode = node.oldType.returnType; // Sollte ein TypeSpecifier-Knoten sein
      const returnTypeJsDoc = returnTypeNode ? this.generateJsDocTypeFromSpecifier(returnTypeNode) : "any";

      const params = node.oldType.params.map(p => {
        let paramJsDocType = "any";
        if (p.typeAnnotation) { // p.typeAnnotation ist der TypeSpecifier-Knoten des Parameters
          paramJsDocType = this.generateJsDocTypeFromSpecifier(p.typeAnnotation);
        }
        const paramNameStr = p.name ? p.name + ': ' : '';
        return `${paramNameStr}${paramJsDocType}`;
      }).join(', ');

      oldTypeString = `function(${params}): ${returnTypeJsDoc}`;
    }

    return `/** @typedef {${oldTypeString}} ${newTypeName} */`;
  }

  // Entfernt: generateStructInitialization(node)
  // Entfernt: generateStructDeclaration(node)

  generateVariableDeclaration(node) {
    const varName = this.generate(node.id); // AST hat id: { type: "Identifier", name: "..." }
    const initCode = node.init ? ` = ${this.generate(node.init)}` : '';
    // Typinformation (node.varType) wird in JS nicht direkt verwendet, aber wir haben sie im AST.
    return `${this.indent()}${node.isConst ? 'const' : 'let'} ${varName}${initCode};`;
  }

  generateFunctionDeclaration(node) {
    const asyncKeyword = node.isAsync ? 'async ' : ''; // isAsync ist nicht im aktuellen AST, aber gut für die Zukunft
    const functionName = this.generate(node.id);

    let paramsString = '';
    if (node.params && node.params.length > 0) {
        // node.params ist jetzt ein flaches Array von Parameter-AST-Knoten
        if (node.params.length === 1 && node.params[0].typeAnnotation && node.params[0].typeAnnotation.name === 'void' && !node.params[0].name) {
            paramsString = ''; // void-Parameter in C/C++ bedeutet keine Parameter in JS
        } else {
            paramsString = node.params.map(paramNode => this.generateParameter(paramNode)).join(', ');
        }
    }

    let generatedBodyContent;
    if (node.expression === true) { // Zeigt an, dass der Body eine Expression ist
        const expressionCode = this.generate(node.body); // node.body ist der Expression-AST
        this.indentationLevel++;
        generatedBodyContent = `${this.indent()}return ${expressionCode};`; // Kein \n am Ende hier
        this.indentationLevel--;
    } else { // Body ist ein BlockStatement
        if (node.body && node.body.type === 'BlockStatement' && node.body.body) {
            this.indentationLevel++;
            generatedBodyContent = node.body.body.map(stmt => this.generate(stmt)).join('\n');
            this.indentationLevel--;
        } else {
            generatedBodyContent = ""; // Leerer Block
        }
    }
    
    // Füge einen Zeilenumbruch hinzu, wenn der Body Inhalt hat
    if (generatedBodyContent !== "") {
        generatedBodyContent += '\n';
    }

    return `${this.indent()}${asyncKeyword}function ${functionName}(${paramsString}) {\n${generatedBodyContent}${this.indent()}}`;
  }

  generateParameter(node) {
    // node ist ein Parameter-Objekt, z.B. { type: "Parameter", name: "n", ... }
    return node.name; // Wir brauchen nur den Namen für JS-Code
  }

  generateReturnStatement(node) {
    return `${this.indent()}return ${this.generate(node.argument)};`;
  }

  generateIfStatement(node) {
    const condition = this.generate(node.test); // AST verwendet 'test'

    let consequentCode = "";
    if (node.consequent && node.consequent.body) { // AST verwendet 'consequent.body' für BlockStatement
      this.indentationLevel++;
      consequentCode = node.consequent.body.map(stmt => this.generate(stmt)).join('\n');
      this.indentationLevel--;
    } else if (node.consequent) { // Falls 'consequent' ein einzelnes Statement ist (nicht im aktuellen AST)
        this.indentationLevel++;
        consequentCode = this.generate(node.consequent);
        this.indentationLevel--;
    }


    let code = `${this.indent()}if (${condition}) {\n${consequentCode}\n${this.indent()}}`;

    if (node.alternate) {
      let alternateCode = "";
      if (node.alternate.type === 'IfStatement') { // else if
        // Kein zusätzliches Einrücken für 'else if', da generateIfStatement dies bereits handhabt
        alternateCode = this.generate(node.alternate);
         code += ` else ${alternateCode}`; // 'else' direkt vor dem 'if'
      } else if (node.alternate.body) { // else { block }
        this.indentationLevel++;
        alternateCode = node.alternate.body.map(stmt => this.generate(stmt)).join('\n');
        this.indentationLevel--;
        code += ` else {\n${alternateCode}\n${this.indent()}}`;
      } else { // else single_statement (nicht im aktuellen AST)
        this.indentationLevel++;
        alternateCode = this.generate(node.alternate);
        this.indentationLevel--;
        code += ` else {\n${alternateCode}\n${this.indent()}}`;
      }
    }
    return code;
  }

  generateForStatement(node) {
    const initializer = node.init ? this.generate(node.init).replace(';', '').trim() : ''; // Entferne Semikolon, falls es von var decl kommt
    const condition = node.test ? this.generate(node.test).trim() : '';
    const increment = node.update ? this.generate(node.update).trim() : '';

    let bodyCode = "";
    if (node.body && node.body.body) {
        this.indentationLevel++;
        bodyCode = node.body.body.map(stmt => this.generate(stmt)).join('\n');
        this.indentationLevel--;
    }

    return `${this.indent()}for (${initializer}; ${condition}; ${increment}) {\n${bodyCode}\n${this.indent()}}`;
  }

  generateForEachStatement(node) {
    // node.left ist die VariableDeclaration für die Schleifenvariable
    const keyword = node.left.isConst ? 'const' : 'let';
    const variableName = node.left.id.name;
    const iterable = this.generate(node.right);

    let bodyCode = "";
    if (node.body && node.body.body) { // Annahme: body ist ein BlockStatement
        this.indentationLevel++;
        bodyCode = node.body.body.map(stmt => this.generate(stmt)).join('\n');
        this.indentationLevel--;
    }
    // Füge einen Zeilenumbruch hinzu, wenn der Body Inhalt hat und nicht leer ist
    const finalBodyCode = bodyCode.trim() === "" ? "" : `\n${bodyCode}\n${this.indent()}`;


    return `${this.indent()}for (${keyword} ${variableName} of ${iterable}) {${finalBodyCode}}`;
  }

  generateExpressionStatement(node) {
    return `${this.indent()}${this.generate(node.expression)};`;
  }

  generateBinaryExpression(node) {
    const left = this.generate(node.left);
    const right = this.generate(node.right);
    // Map '==' to '===' and '!=' to '!=='
    const operator = node.operator === '=='
      ? '==='
      : node.operator === '!='
        ? '!=='
        : node.operator;
    return `${left} ${operator} ${right}`;
  }

  // NEU für LogicalExpression
  generateLogicalExpression(node) {
    const left = this.generate(node.left);
    const right = this.generate(node.right);
    // Die Operatoren && und || sind in JS und C-ähnlichen Sprachen gleich
    return `${left} ${node.operator} ${right}`;
  }

  generateUnaryExpression(node) {
    const argument = this.generate(node.argument);
    if (node.prefix) {
      return `${node.operator}${argument}`; // Prefix operator (e.g., ++i)
    } else {
      return `${argument}${node.operator}`; // Postfix operator (e.g., i++)
    }
  }

  generateMemberExpression(node) {
    const object = this.generate(node.object);
    const property = this.generate(node.property);
    const operator = node.optional ? '?.' : '.'; // NEU: Optional Chaining Operator

    if (node.computed) {
      // Optional Chaining für berechnete Eigenschaften ist ?.[]
      return `${object}${node.optional ? '?.': ''}[${property}]`;
    } else {
      return `${object}${operator}${property}`; // Punktnotation oder Optional Chaining Punktnotation
    }
  }

  // Ersetzt generateNumericLiteral und generateStringLiteral
  generateLiteral(node) {
    if (typeof node.value === 'string') {
      return JSON.stringify(node.value); // Korrektes Escaping für Strings
    }
    return node.raw !== undefined ? node.raw : String(node.value); // Bevorzuge raw, wenn vorhanden (z.B. für Zahlen)
  }

  generateIdentifier(node) {
    return node.name;
  }

  generateCallExpression(node) {
    const callee = this.generate(node.callee);
    const args = node.arguments.map(arg => this.generate(arg)).join(', ');
    return `${callee}(${args})`;
  }

  // Entfernt: generateStringLiteral(node) da von generateLiteral abgedeckt

  generateLambdaExpression(node) {
    // AST-Struktur für params: [{type: "Parameter", name: "e", ...}]
    const params = node.params.map(paramNode => this.generateParameter(paramNode)).join(', ');

    // AST-Struktur für body: { type: "BlockStatement", body: [...] }
    let bodyContent = "";
    if (node.body && node.body.body) {
      this.indentationLevel++;
      bodyContent = node.body.body.map(stmt => this.generate(stmt)).join('\n');
      this.indentationLevel--;
    }
    
    if (node.hasAmpersandCapture) { // NEU: Prüfen auf Ampersand-Capture
      return `function(${params}) {\n${bodyContent}\n${this.indent()}}`;
    } else {
      return `(${params}) => {\n${bodyContent}\n${this.indent()}}`;
    }
  }

  // NEU für ObjectLiteral
  generateObjectLiteral(node) {
    if (!node.properties || node.properties.length === 0) {
      return '{}';
    }
    this.indentationLevel++;
    const props = node.properties.map(prop => this.generateObjectProperty(prop)).join(',\n');
    this.indentationLevel--;
    return `{\n${props}\n${this.indent()}}`;
  }

  // NEU für ObjectProperty (intern von generateObjectLiteral verwendet)
  generateObjectProperty(node) {
    const key = this.generate(node.key); // key ist ein Identifier
    const value = this.generate(node.value);
    return `${this.indent()}${key}: ${value}`;
  }

  // NEU für ArrayLiteral
  generateArrayLiteral(node) {
    if (!node.elements || node.elements.length === 0) {
      return '[]';
    }
    this.indentationLevel++;
    const elems = node.elements.map(elem => this.generate(elem)).join(', ');
    this.indentationLevel--;
    return `[${elems}]`;
  }
}
