import { parseCode } from './chevro-parser.js';
import { astBuilder } from './ast-builder.js';
import CodeGenerator from './code-generator.js';
import * as fs from 'fs';

try {
  const code = fs.readFileSync('./index.c2', 'utf-8');

  const { cst, tokens, lexErrors, parseErrors } = parseCode(code);

  if (lexErrors.length > 0) {
    console.error("Lexer Fehler:", lexErrors);
  }
  if (parseErrors.length > 0) {
    console.error("Parser Fehler:", parseErrors);
  }

  if (lexErrors.length === 0 && parseErrors.length === 0) {
    console.log("CST erfolgreich erstellt.");
    // CST in Datei schreiben (optional, zum Debuggen)
    fs.writeFileSync('cst.json', JSON.stringify(cst, null, 2));
    fs.writeFileSync('tokens.json', JSON.stringify(tokens, null, 2));

    // AST aus CST erstellen
    const ast = astBuilder.visit(cst);
    console.log("AST erfolgreich erstellt.");
    fs.writeFileSync('ast.json', JSON.stringify(ast, null, 2)); // AST in Datei schreiben

    // Code aus AST generieren
    const generator = new CodeGenerator();
    // Der AST-Wurzelknoten ist { type: "Program", body: [...] }
    // Wir rufen generate für jeden Knoten im body des Programms auf.
    const generatedCode = ast.body.map(node => generator.generate(node)).join('\n\n');
    
    fs.writeFileSync('source.js', generatedCode, { encoding: 'utf-8' });
    console.log("\nJavaScript Code wurde in source.js geschrieben.");
  }
} catch (error) {
  console.error("Ein Fehler ist aufgetreten:", error.message);
  if (error.stack) {
    console.error(error.stack);
  }
}
