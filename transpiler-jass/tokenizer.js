/**
 * @typedef Token
 * @property {string} type
 * @property {string} [value]
 */

export default class Scanner {
  static #KEYWORDS = [
    'nothing', 'null', 'nil', 'string', 'integer', 'real', 'boolean', 'object',
    'globals', 'endglobals',
    'function', 'endfunction', 'await',
    'takes', 'returns',
    'do', 'enddo',
    'end',
    'local', 'constant', 'new', 'set', 'return',
    'if', 'then', 'else', 'elseif', 'endif',
    'is', 'not', 'and', 'or',
    'loop', 'exitwhen', 'endloop',
    'for', 'to', 'in',
    'struct', 'endstruct',
    'call',
    'debug',
    'condition', 'expect',
    'import', 'from',
    'interface', 'endinterface',
    'typedef',
    'ref'
  ];

  /** @type {Token[]} */
  #tokens = [];

  #isNumber(str) {
    return /^\d+$/.test(str);
  }

  #isAlphaNumeric(str) {
    return /^[A-Za-z0-9_$#]+$/.test(str);
  }

  #isKeyword(str) {
    return Scanner.#KEYWORDS.includes(str.toLowerCase());
  }

  #isOperator(str) {
    return /^[!+*\/\-=.,:<>\[\]]+$/.test(str);
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

      if (token === '`') {
        let strValue = '`';
        index++;

        while (str[index] !== '`') {
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

      if (this.#isNumber(token) && !this.#isNumber(peek)) {
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
        this.#tokens.push({ type: 'OPERATOR', value: token });

        token = '';
      }
    }

    this.#tokens.push({ type: 'EOF' });

    return this.#tokens;
  }
}
