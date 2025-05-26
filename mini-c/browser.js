import { parseCode } from './chevro-parser.js';
import { astBuilder } from './ast-builder.js';
import CodeGenerator from './code-generator.small.js';

document.addEventListener('DOMContentLoaded', () => {
  const scripts = document.querySelectorAll('script[type="text/mini-c"]');
  for (const script of scripts) {
    try {
      const { cst, lexErrors, parseErrors } = parseCode(script.textContent);
      
      if (lexErrors.length > 0) {
        console.error("Lexer Fehler:", lexErrors);
      }
      if (parseErrors.length > 0) {
        console.error("Parser Fehler:", parseErrors);
      }
      
      if (lexErrors.length === 0 && parseErrors.length === 0) {
        const ast = astBuilder.visit(cst);
        const generator = new CodeGenerator();
        const generatedCode = ast.body.map(node => generator.generate(node)).join('');
        const scriptElement = document.createElement('script');
        scriptElement.type = 'text/javascript';
        scriptElement.textContent = generatedCode;
        document.body.appendChild(scriptElement);
      }
    } catch (error) {
      console.error("Ein Fehler ist aufgetreten:", error.message);
    }
  }
});
