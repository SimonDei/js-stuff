import Scanner from './tokenizer.js';
import Parser from './parser.js';
import Walker from './walker.js';
import * as fs from 'fs';
import * as util from 'util';

const code = fs.readFileSync('./index.b', { encoding: 'utf-8' });

const scanner = new Scanner();
const tokens = scanner.tokenize(code);

console.log(tokens);

fs.writeFileSync('./tokens.txt', tokens.reduce((acc, tok) => acc + `{ type: '${tok.type}'${tok.value ? `, value: '${tok.value }'` : ''} },\n`, ''), { encoding: 'utf-8' });

const parser = new Parser(tokens);
const { ast } = parser.parse('EOF');

console.log(util.inspect(ast, false, { depth: 100 }));

const walker = new Walker(ast);
walker.walk();
walker.addStdFunctions();

fs.writeFileSync('./source.js', walker.getSource(), { encoding: 'utf-8' });
