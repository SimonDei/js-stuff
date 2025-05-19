export default class Scanner {
  static KEYWORDS = new Set([
    'void', 'auto', 'int', 'float', 'string', 'null', 'bool',
    'true', 'false',
    'await',
    'const', 'new', 'return',
    'if', 'else', 'elseif',
    'for', 'to', 'in',
    'struct',
    'assert',
    'import', 'from',
    'typedef',
  ]);

  tokens = [];

  isAlphaNumeric(char) {
    return /^[A-Za-z0-9_$#]$/.test(char);
  }

  isOperatorChar(char) {
    return /[?!+*\/\-=.,:<>\[\]]/.test(char);
  }

  isKeyword(str) {
    return Scanner.KEYWORDS.has(str.toLowerCase());
  }

  consumeString(input, index, delimiter, line) {
    let value = delimiter;
    index++;

    while (index < input.length && input[index] !== delimiter) {
      if (input[index] === '\n') line++;
      value += input[index++];
    }

    if (input[index] === delimiter) {
      value += input[index++];
    }

    this.tokens.push({ type: 'STRING', value, line });
    return { index, line };
  }

  tokenize(input) {
    this.tokens = [];
    let index = 0;
    let line = 1;

    while (index < input.length) {
      const char = input[index];

      if (/\s/.test(char)) {
        if (char === '\n') {
          this.tokens.push({ type: 'EOL', value: null, line });
          line++;
        }
        index++;
        continue;
      }

      if (char === ';') {
        this.tokens.push({ type: 'SEMICOLON', value: ';', line });
        index++;
        continue;
      }

      if (char === '"' || char === '\'' || char === '`') {
        const result = this.consumeString(input, index, char, line);
        index = result.index;
        line = result.line;
        continue;
      }

      // Handle negative numbers
      if (char === '-' && /\d/.test(input[index + 1])) {
        let num = '-';
        index++; // consume '-'
        while (index < input.length && /[\d.]/.test(input[index])) {
          num += input[index++];
        }
        this.tokens.push({ type: 'NUMBER', value: num, line });
        continue;
      }

      if (/\d/.test(char)) {
        let num = '';
        let dotCount = 0;
        while (index < input.length && /[\d.]/.test(input[index])) {
          if (input[index] === '.') {
            if (dotCount++ > 0) break;
          }
          num += input[index++];
        }
        this.tokens.push({ type: 'NUMBER', value: num, line });
        continue;
      }

      if (/[A-Za-z_]/.test(char)) {
        let ident = '';
        while (index < input.length && this.isAlphaNumeric(input[index])) {
          ident += input[index++];
        }
        const type = this.isKeyword(ident) ? 'KEYWORD' : 'IDENTIFIER';
        this.tokens.push({ type, value: ident, line });
        continue;
      }

      const singleCharTokens = {
        '(': 'LPAREN',
        ')': 'RPAREN',
        '{': 'LBRACE',
        '}': 'RBRACE',
      };

      if (singleCharTokens[char]) {
        this.tokens.push({ type: singleCharTokens[char], value: null, line });
        index++;
        continue;
      }

      if (this.isOperatorChar(char)) {
        let op = '';
        while (index < input.length && this.isOperatorChar(input[index])) {
          op += input[index++];
        }
        this.tokens.push({ type: 'OPERATOR', value: op, line });
        continue;
      }

      index++; // skip unrecognized
    }

    this.tokens.push({ type: 'EOF', value: null, line });
    return this.tokens;
  }
}
