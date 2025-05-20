/** 
 * A simple scanner (tokenizer) that breaks input code into tokens 
 * like identifiers, keywords, operators, etc.
 */
export default class Scanner {
  /**
   * A set of recognized keywords in the language.
   * @type {Set<string>}
   */
  static KEYWORDS = new Set([
    'void', 'auto', 'int', 'float', 'string', 'null', 'bool',
    'true', 'false',
    'async', 'await',
    'const', 'new', 'return',
    'if', 'else',
    'for',
    'struct',
    'assert',
    'import', 'from',
    'typedef',
  ]);

  /**
   * An array of tokens generated from the input.
   * @type {Array<{type: string, value: string|null, line: number}>}
   */
  tokens = [];

  /**
   * Checks if a character is alphanumeric or an underscore, dollar, etc.
   * @param {string} char - The character to check.
   * @returns {boolean} True if alphanumeric or special, false otherwise.
   */
  isAlphaNumeric(char) {
    return /^[A-Za-z0-9_$#]$/.test(char);
  }

  /**
   * Checks if a character is recognized as an operator symbol.
   * @param {string} char - The character to check.
   * @returns {boolean} True if an operator symbol, false otherwise.
   */
  isOperatorChar(char) {
    return /[&|?!+*\/\-=.,:<>\[\]]/.test(char);
  }

  /**
   * Checks if a string is one of the known language keywords.
   * @param {string} str - The string to check.
   * @returns {boolean} True if a keyword, false otherwise.
   */
  isKeyword(str) {
    return Scanner.KEYWORDS.has(str.toLowerCase());
  }

  /**
   * Consumes a string literal starting at the given index 
   * until it encounters the matching delimiter or end of input.
   * @param {string} input - The entire source code.
   * @param {number} index - Current scanning position in the source code.
   * @param {string} delimiter - The string delimiter character.
   * @param {number} line - Current line number for tokens.
   * @returns {{index: number, line: number}} The updated index and line number.
   */
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

  /**
   * Converts the given input code into a sequence of tokens.
   * @param {string} input - The source code to tokenize.
   * @returns {Array<{type: string, value: string|null, line: number}>} The list of tokens.
   */
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

      if (/[A-Za-z_$#]/.test(char)) {
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
        '[': 'LBRACKET',
        ']': 'RBRACKET'
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

      // Skip unrecognized characters
      index++;
    }

    this.tokens.push({ type: 'EOF', value: null, line });
    return this.tokens;
  }
}
