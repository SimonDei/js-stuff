/**
 * @typedef Token
 * @property {string} type
 * @property {string} [value]
 */

export default class Scanner {
  static #KEYWORDS = [
    '.data', '.code', 'end',
    'byte', 'word', 'dword', 'qword', 'real4', 'real8',
    'proc', 'endp',
    'mov', 'lea', 'add', 'sub', 'inc', 'dec', 'call', 'push', 'invoke', 'jmp',
    '.while', '.endw',
    '.repeat', '.until',
    '.if', '.else', '.endif',
    '.err', '.errnz', '.errb', '.errnb', '.erre',
    'sizestr', 'substr', 'catstr',
    'echo'
  ];

  /** @type {Token[]} */
  #tokens = [];

  #isNumber(str) {
    return /^\d[\d.]*$/.test(str);
  }

  #isAlphaNumeric(str) {
    return /^[A-Za-z0-9_$#.]+$/.test(str);
  }

  #isKeyword(str) {
    return Scanner.#KEYWORDS.includes(str.toLowerCase());
  }

  #isOperator(str) {
    return /^[?!+*\/\-=.,:<>\[\]]+$/.test(str);
  }

  /**
   * @param {string} str
   * @returns {Token[]}
   */
  tokenize(str) {
    let token = '';

    for (let index = 0; index < str.length; index++) {
      token += str[index];

      if (token === ';') {
        token = '';
        continue;
      }

      if (token === '\n' || token === '\r\n') {
        this.#tokens.push({ type: 'EOL' });

        token = '';
        continue;
      }

      token = token.trim();

      const peek = str[index + 1];

      if (token === '"') {
        let strValue = '"';
        index++;

        while (str[index] !== '"') {
          strValue += str[index];
          index++;
        }

        strValue += str[index];

        this.#tokens.push({ type: 'STRING', value: strValue });

        token = '';
        continue;
      }

      if (token === '\'') {
        let strValue = '\'';
        index++;

        while (str[index] !== '\'') {
          strValue += str[index];
          index++;
        }

        strValue += str[index];

        this.#tokens.push({ type: 'STRING', value: strValue });

        token = '';
        continue;
      }

      if (this.#isNumber(token) && !this.#isNumber(token + peek)) {
        this.#tokens.push({ type: 'NUMBER', value: token });

        token = '';
        continue;
      }

      if (token === '(' || token === ')') {
        token === '('
          ? this.#tokens.push({ type: 'LPAREN' })
          : this.#tokens.push({ type: 'RPAREN' });

        token = '';
        continue;
      }

      if (token === '{' || token === '}') {
        token === '{'
          ? this.#tokens.push({ type: 'LBRACE' })
          : this.#tokens.push({ type: 'RBRACE' });

        token = '';
        continue;
      }

      if (this.#isAlphaNumeric(token) && !this.#isAlphaNumeric(peek)) {
        if (this.#isKeyword(token)) {
          this.#tokens.push({ type: 'KEYWORD', value: token });
        } else {
          this.#tokens.push({ type: 'IDENTIFIER', value: token });
        }

        token = '';
        continue;
      }

      if (token === '[' || token === ']') {
        this.#tokens.push({ type: 'OPERATOR', value: token });

        token = '';
        continue;
      }

      if (this.#isOperator(token) && !this.#isOperator(peek)) {
        if (token === '.' && peek !== ' ') {
          continue;
        }

        this.#tokens.push({ type: 'OPERATOR', value: token });

        token = '';
      }
    }

    this.#tokens.push({ type: 'EOF' });

    return this.#tokens;
  }
}
