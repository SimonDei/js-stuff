import Scanner from './tokenizer.js';
import Parser from './parser.js';
import Walker from './walker.js';
import * as fs from 'fs';
import * as util from 'util';

const userArgs = process.argv.slice(2);
let typesEnabled = true;

if (userArgs.length > 0) {
  if (userArgs.includes('--types')) {
    typesEnabled = true;
  }
}

const code = fs.readFileSync('./index.j', { encoding: 'utf-8' });

const scanner = new Scanner();
const tokens = scanner.tokenize(code);

console.log(tokens);

fs.writeFileSync('./tokens.txt', tokens.reduce((acc, tok) => acc + `{ type: '${tok.type}'${tok.value ? `, value: '${tok.value }'` : ''} },\n`, ''), { encoding: 'utf-8' });

const parser = new Parser(tokens, typesEnabled);
const { ast } = parser.parse('EOF');

fs.writeFileSync('./ast.txt', util.inspect(ast, false, { depth: 100 }));

const walker = new Walker(ast, typesEnabled);
walker.walk();
walker.addStdFunctions();
walker.addImportStatements();

fs.writeFileSync('./source.js', walker.getSource(), { encoding: 'utf-8' });
