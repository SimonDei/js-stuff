import fs from 'fs';
import path from 'path';

const builtins = {
  HTML: {
    Include: function(str) {
      return compile(parse(fs.readFileSync(path.join(__dirname, 'views', str), 'utf8')));
    },
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
  // ========== Date/Time Functions ========== //
  Date: function() {
    return Intl.DateTimeFormat('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  },
  Day: function(str) {
    return new Date(str).getDate();
  },
  Hour: function(str) {
    return new Date(str).getHours();
  },
  IsDate: function(str) {
    return !isNaN(Date.parse(str));
  },
  Minute: function(str) {
    return new Date(str).getMinutes();
  },
  Month: function(str) {
    return new Date(str).getMonth() + 1;
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
  Second: function(str) {
    return new Date(str).getSeconds();
  },
  Time: function() {
    return Intl.DateTimeFormat('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date());
  },
  Weekday: function(str) {
    return new Date(str).getDay() + 1;
  },
  WeekdayName: function(str) {
    return new Date(str).toLocaleDateString('de-DE', {
      weekday: 'long'
    });
  },
  Year: function(str) {
    return new Date(str).getFullYear();
  },
  // ========== Conversion Functions ========== //
  Asc: function(val) {
    return val.charCodeAt(0);
  },
  Chr: function(val) {
    return String.fromCharCode(val);
  },
  // ========== Math Functions ========== //
  Abs: function(val) {
    return Math.abs(val);
  },
  Hex: function(val) {
    return val.toString(16);
  },
  Int: function(val) {
    return Number.parseInt(val);
  },
  Oct: function(val) {
    return val.toString(8);
  },
  Rnd: function() {
    return Math.random();
  },
  Sqr: function(val) {
    return Math.sqrt(val);
  },
  // ========== Array Functions ========== //
  Array: function(...vals) {
    return [...vals];
  },
  Filter: function(str, needle, include = true) {
    return str.filter(item => include ? item.includes(needle) : !item.includes(needle));
  },
  IsArray: function(val) {
    return Array.isArray(val);
  },
  Join: function(arr, delimiter = " ") {
    return arr.join(delimiter);
  },
  LBound: function(arr) {
    return 0;
  },
  Split: function(val, delimiter = " ", count = -1) {
    return val.split(delimiter, count);
  },
  UBound: function(arr) {
    return arr.length - 1;
  },
  // ========== String Functions ========== //
  InStr: function(val, needle, start = 1) {
    return val.indexOf(needle, start - 1) + 1;
  },
  InStrRev: function(val, needle, start = -1) {
    return val.lastIndexOf(needle, start - 1) + 1;
  },
  LCase: function(val) {
    return val.toLowerCase();
  },
  Left: function(val, len) {
    return val.slice(0, len);
  },
  Len: function(val) {
    return val.length;
  },
  LTrim: function(val) {
    return val.trimStart();
  },
  RTrim: function(val) {
    return val.trimEnd();
  },
  Trim: function(val) {
    return val.trim();
  },
  Mid: function(val, start, len) {
    return val.slice(start, start + len);
  },
  Replace: function(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
  },
  Right: function(val, len) {
    return val.slice(-len);
  },
  StrComp: function(str1, str2) {
    return str1.localeCompare(str2);
  },
  String: function(len, char) {
    return char.repeat(len);
  },
  StrReverse: function(val) {
    return val.split('').reverse().join('');
  },
  UCase: function(val) {
    return val.toUpperCase();
  },
  // ========== Other Functions ========== //
  IsEmpty: function(val) {
    if (typeof val === 'object') {
      return Object.keys(val).length === 0;
    }
    return val === undefined || val === null || val === '';
  },
  IsNull: function(val) {
    return val === null;
  },
  IsNumeric: function(val) {
    return !isNaN(val);
  },
  Round: function(val, decimals) {
    return Number(val.toFixed(decimals));
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
const selectCaseRegexp = /<%\s*select\s+case\s+(?<variable>\w+)\s*%>(?<cases>[\s\S]+?)<%\s*end\s+select\s*%>/gi; const caseRegexp = /<%\s*case\s+(?<value>[\s\S]+?)\s*%>(?<inner>[\s\S]+?)<%\s*end\s*case\s*%>/gi; const elseCaseRegexp = /<%\s*case\s*else\s*%>(?<inner>[\s\S]+?)<%\s*end\s*case\s*%>/i;
const escapeExprRegexp = /<%=\s*([\s\S]+?)\s*%>/gi;
const exprRegexp = /<%\s*(?<expression>[\s\S]+?)\s*%>/gi;

/**
 * @param {string} source The template source code
 * @returns {string}
 */
export function parse(source) {
  return source
    .replace(/(^|\r|\n)\t* +| +\t*(\r|\n|$)/g, " ")
    .replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g, "")
    .replace(/'|\\/g, "\$&")
    .replace(/''/gi, '\\\'\\\'')
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
      return `'+((() => {let o = '';for(let ${item.trim()} = ${start.trim()}; i < ${end.trim()}; i++){o += '${inner.replace(/'/g, "\\'")}'}return o;})())+'`
    })
    .replace(forInRegexp, (_, item, array_expr, inner) => {
      return `'+(${array_expr.trim()}.map(${item} => {return '${inner.replace(/'/g, "\\'")}';}).join(''))+'`;
    })
    .replace(selectCaseRegexp, (_, variable, cases) => {
      let elseBlock = '';
      if (cases.match(elseCaseRegexp)) {
        cases = cases.replace(elseCaseRegexp, (_, inner) => {
          elseBlock = `default: result = '${inner.replace(/'/g, "\\'")}';`;
          return '';
        });
      }
      const caseBlocks = cases.replace(caseRegexp, (_, value, inner) => {
        return `case ${value.trim()}: result = '${inner.replace(/'/g, "\\'")}';break;`;
      });
      return `'+((() => {let s = ${variable.trim()};let r = '';switch(s){${caseBlocks} ${elseBlock}}return r;})())+'`;
    })
    .replace(escapeExprRegexp, (_, expression) => {
      return `'+(HTML.Encode(${expression}))+'`;
    })
    .replace(exprRegexp, (_, expression) => {
      return `'+(${expression.trim()})+'`;
    })
    .replace(/\n/g, "\\n")
    .replace(/\t/g, '\\t')
    .replace(/\r/g, "\\r")
		.replace(/(\s|;|\}|^|\{)out\+='';/g, '$1')
}

/**
 * @param {string} template The parsed template code
 * @param {object} data
 * @returns {string}
 */
export function compile(template, data = {}) {
  data = { ...data, ...builtins };

  return new Function('data', "let out = '';with(data){out = '" + template + "'}return out;")(data);
}

/*
async function viewAsp(page, data, opts) {
  data = Object.assign({}, defaultCtx, this.locals, data)
  page = await getTemplate(getPage(page, 'asp'));
  return engine.parseTemplate(page, data)
}
*/
