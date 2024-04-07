import Scanner from './tokenizer.js';
import Parser from './parser.js';
import Walker from './walker.js';

function interpretScripts() {
  const scripts = document.querySelectorAll('script[type="text/basescript"]');

  const scanner = new Scanner();
  const parser = new Parser();

  for (const script of scripts) {
    const typesEnabled = Boolean(script.dataset?.types);
    parser.setTypesEnabled(typesEnabled);

    const tokens = scanner.tokenize(script.textContent);

    parser.reset(tokens);
    const { ast } = parser.parse('EOF');

    const walker = new Walker(ast, typesEnabled);
    walker.walk();
    walker.addStdFunctions();

    const newScript = document.createElement('script');
    newScript.type = 'text/javascript';
    newScript.textContent = walker.getSource();

    document.body.append(newScript);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    interpretScripts();
  });
} else {
  interpretScripts();
}
