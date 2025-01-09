const builtins = {
  HTML: {
    Encode: function(val) {
      return val.toString().replace(/[&<>"'/]/g, m => {
        return '&#' + m.charCodeAt(0) + ';';
      });
    }
  },
  Response: {
    Write: function(val) {
      return val.toString();
    }
  },
  /**
   * Returns a Boolean value that indicates whether a specified variable has been initialized or not
   */
  IsEmpty: function(val) {
    if (typeof val === 'object') {
      return Object.keys(val).length === 0;
    }
    return val === undefined || val === null || val === '';
  },
  /**
   * Returns a Boolean value that indicates whether a specified expression contains no valid data (Null)
   */
  IsNull: function(val) {
    return val === null;
  },
  /**
   * Returns a Boolean value that indicates whether a specified expression can be evaluated as a number
   */
  IsNumeric: function(val) {
    return !isNaN(val);
  },
  /**
   * Returns the number of characters in a string or the number of elements in an array.
   */
  Len: function(val) {
    return Array.isArray(val) || typeof val === 'string' ? val.length : 0;
  },
  Date: function() {
    return Intl.DateTimeFormat('de-DE').format(new Date());
  },
  Now: function() {
    return Intl.DateTimeFormat('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date());
  },
  /**
   * Returns a variant containing an array
   */
  Array: function(...vals) {
    return [...vals];
  },
  /**
   * Returns a Boolean value that indicates whether a specified variable is an array
   */
  IsArray: function(val) {
    return Array.isArray(val);
  },
  /**
   * Removes spaces on both the left and the right side of a string
   */
  Trim: function(val) {
    return val.trim();
  },
  /**
   * Removes spaces on the left side of a string
   */
  LTrim: function(val) {
    return val.trimStart();
  },
  /**
   * Removes spaces on the right side of a string
   */
  RTrim: function(val) {
    return val.trimEnd();
  },
  /**
   * Returns a specified number of characters from the left side of a string
   */
  Left: function(val, len) {
    return val.slice(0, len);
  },
  /**
   * Returns a specified number of characters from the right side of a string
   */
  Right: function(val, len) {
    return val.slice(-len);
  },
  /**
   * Returns a specified number of characters from a string
   */
  Mid: function(val, start, len) {
    return val.slice(start, start + len);
  },
  /**
   * Returns a string that contains a repeating character of a specified length
   */
  String: function(len, char) {
    return char.repeat(len);
  },
  /**
   * Reverses a string
   */
  StrReverse: function(val) {
    return val.split('').reverse().join('');
  },
  /**
   * Converts a specified string to uppercase
   */
  UCase: function(val) {
    return val.toUpperCase();
  },
  /**
   * Converts a specified string to lowercase
   */
  LCase: function(val) {
    return val.toLowerCase();
  },
  /**
   * Rounds a number
   */
  Round: function(val, decimals) {
    return Number(val.toFixed(decimals));
  },
  /**
   * Returns a zero-based, one-dimensional array that contains a specified number of substrings
   */
  Split: function(val, delimiter = " ", count = -1) {
    return val.split(delimiter, count);
  },
  /**
   * Returns a string that consists of a number of substrings in an array
   */
  Join: function(arr, delimiter = " ") {
    return arr.join(delimiter);
  },
  ObjectKeys: function(obj) {
    return Object.keys(obj);
  },
  ObjectProp: function(obj, prop) {
    return obj[prop];
  }
};

const dimRegexp = /<%\s*dim\s+(?<varname>\w+)\s*=\s*(?<expression>[\s\S]+?)\s*%>/gi;
const setRegexp = /<%\s*set\s+(?<varname_expr>[\s\S]+)\s*=\s*(?<expression>[\s\S]+?)\s*%>/gi;
const ifRegexp = /<%\s*if\s+(?<condition>[\s\S]+?)\s*then\s*%>(?<then>[\s\S]+?)(<%\s*else\s*%>(?<else>[\s\S]+?))?<%\s*end\s+if\s*%>/gi;
const forInRegexp = /<%\s*for\s+each\s+(?<item>\w+)\s+in\s+(?<array_expr>[\s\S]+?)\s*%>(?<inner>[\s\S]+?)<%\s*next\s*%>/gi;
const forToRegexp = /<%\s*for\s+(?<item>\w+)\s*=\s*(?<start>\d+)\s+to\s+(?<end>\d+)\s*%>(?<inner>[\s\S]+?)<%\s*next\s*%>/gi;
const escapeExprRegexp = /<%!\s*([\s\S]+?)\s*%>/gi;
const exprRegexp = /<%\s*(?<expression>[\s\S]+?)\s*%>/gi;

/**
 * @param {string} template
 * @param {object} data
 * @returns {string}
 */
export function parseTemplate(template, data = {}) {
  const combinedData = { ...data, ...builtins };

  template = template
    .replace(/(^|\r|\n)\t* +| +\t*(\r|\n|$)/g," ")
    .replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g,"")
    .replace(/'|\\/g, "\$&")
    .replace(dimRegexp, (_, varname, expression) => {
      return `';(${varname.trim()} = ${expression.trim()});out+='`;
    })
    .replace(setRegexp, (_, varname_expr, expression) => {
      return `';(${varname_expr.trim()} = ${expression.trim()});out+='`;
    })
    .replace(ifRegexp, (_, condition, then, __, elseBlock) => {
      return `'+((${condition.trim()}) ? '${then}' : '${elseBlock || ''}')+'`;
    })
    .replace(forToRegexp, (_, item, start, end, inner) => {
      return `'+((() => {let lout = '';for(let ${item.trim()} = ${start.trim()}; i < ${end.trim()}; i++){lout += '${inner.replace(/'/g, "\\'")}'}return lout;})())+'`
    })
    .replace(forInRegexp, (_, item, array_expr, inner) => {
      return `'+(${array_expr.trim()}.map(${item} => {return '${inner.replace(/'/g, "\\'")}';}).join(''))+'`;
    })
    .replace(escapeExprRegexp, (_, expression) => {
      return `'+HTML.Encode(${expression})+'`;
    })
    .replace(exprRegexp, (_, expression) => {
      return `'+(${expression.trim()})+'`;
    })
    .replace(/\n/g, "\\n")
    .replace(/\t/g, '\\t')
    .replace(/\r/g, "\\r")
		.replace(/(\s|;|\}|^|\{)out\+='';/g, '$1')
    .replace(/\+''/g, "");

  return new Function('data', "let out = '';with(data){out = '" + template + "'}return out;")(combinedData);
}

/*
async function viewAsp(page, data, opts) {
  data = Object.assign({}, defaultCtx, this.locals, data)
  page = await getTemplate(getPage(page, 'asp'));
  return engine.parseTemplate(page, data)
}
*/
