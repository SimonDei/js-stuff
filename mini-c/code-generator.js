export default class CodeGenerator {
  constructor() {
    this.indentationLevel = 0; // Track the current indentation level
    this.userDefinedStructs = new Map(); // Track user-defined structs
  }

  indent() {
    return '  '.repeat(this.indentationLevel); // 2 spaces per level
  }

  generate(node) {
    switch (node.type) {
      case 'FunctionDeclaration':
        return this.generateFunctionDeclaration(node);
      case 'VariableDeclaration':
        return this.generateVariableDeclaration(node);
      case 'ReturnStatement':
        return this.generateReturnStatement(node);
      case 'IfStatement':
        return this.generateIfStatement(node);
      case 'ForStatement':
        return this.generateForStatement(node);
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
      case 'NumericLiteral':
        return this.generateNumericLiteral(node);
      case 'Identifier':
        return this.generateIdentifier(node);
      case 'CallExpression':
        return this.generateCallExpression(node);
      case 'StringLiteral':
        return this.generateStringLiteral(node);
      case 'LambdaExpression':
        return this.generateLambdaExpression(node);
      case 'StructDeclaration':
        return this.generateStructDeclaration(node);
      case 'StructInitialization': // Add support for StructInitialization
        return this.generateStructInitialization(node);
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  generateAssignmentExpression(node) {
    const left = this.generate(node.left);
    const right = this.generate(node.right);
    return `${left} ${node.operator} ${right}`;
  }

  generateStructInitialization(node) {
    // Generate code for initializing a struct
    const fields = node.fields.map((field, index) => {
      return this.generate(field);
    });
    return `new ${node.structName}(${fields.map(f => `${f}, `).join('').slice(0, -2)})`;
  }

  generateStructDeclaration(node) {
    // Add the struct name to the set of user-defined structs
    this.userDefinedStructs.set(node.name, node.fields);
    let classDef = `class ${node.name} {\n`;
    this.indentationLevel++;
    classDef += `${this.indent()}constructor(${node.fields.map(field => field.name).join(', ')}) {\n`;
    this.indentationLevel++;
    classDef += node.fields.map(field => `${this.indent()}this.${field.name} = ${field.name};`).join('\n') + '\n';
    this.indentationLevel--;
    classDef += `${this.indent()}}\n`;
    this.indentationLevel--;
    return classDef + `${this.indent()}}`;
  }

  generateVariableDeclaration(node) {
    const initCode = node.init
      ? ` = ${this.generate(node.init)}`
      : this.userDefinedStructs.has(node.varType)
      ? ` = new ${node.varType}()`
      : '';
    return `${node.isConst ? 'const' : 'let'} ${node.name}${initCode};`;
  }

  generateFunctionDeclaration(node) {
    const asyncKeyword = node.isAsync ? 'async ' : ''; // Add 'async' if the function is async
    const params = node.parameters.map(param => param.name).join(', ');
    this.indentationLevel++;
    const body = node.body.map(stmt => this.indent() + this.generate(stmt)).join('\n');
    this.indentationLevel--;
    return `${asyncKeyword}function ${node.name}(${params}) {\n${body}\n}`;
  }

  generateReturnStatement(node) {
    return `return ${this.generate(node.argument)};`;
  }

  generateIfStatement(node) {
    const condition = this.generate(node.condition);

    this.indentationLevel++;
    const consequent = node.consequent.map(stmt => this.indent() + this.generate(stmt)).join('\n');
    this.indentationLevel--;

    let code = `if (${condition}) {\n${consequent}\n${this.indent()}}`;

    if (node.alternate) {
      this.indentationLevel++;
      const alternate = Array.isArray(node.alternate)
        ? node.alternate.map(stmt => this.indent() + this.generate(stmt)).join('\n')
        : this.generate(node.alternate);
      this.indentationLevel--;
      code += ` else {\n${alternate}\n${this.indent()}}`;
    }

    return code;
  }

  generateForStatement(node) {
    const initializer = this.generate(node.initializer);
    const condition = this.generate(node.condition);
    const increment = this.generate(node.increment);

    this.indentationLevel++;
    const body = node.body.map(stmt => this.indent() + this.generate(stmt)).join('\n');
    this.indentationLevel--;

    return `for (${initializer} ${condition}; ${increment}) {\n${body}\n${this.indent()}}`;
  }

  generateExpressionStatement(node) {
    return `${this.generate(node.expression)};`;
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
    return `${object}.${property}`;
  }

  generateNumericLiteral(node) {
    return node.value;
  }

  generateIdentifier(node) {
    return node.name;
  }

  generateCallExpression(node) {
    const callee = this.generate(node.callee);
    const args = node.arguments.map(arg => this.generate(arg)).join(', ');
    return `${callee}(${args})`;
  }

  generateStringLiteral(node) {
    return node.value;
  }

  generateLambdaExpression(node) {
    const params = node.parameters.map(param => param.name).join(', ');
    this.indentationLevel++;
    const body = node.body.map(stmt => this.indent() + this.generate(stmt)).join('\n');
    this.indentationLevel--;
    return `(${params}) => {\n${body}\n${this.indent()}}`;
  }
}
