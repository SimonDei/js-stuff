import Scanner from './tokenizer.js';
import Parser from './parser.js';
import Walker from './walker.js';
import * as util from 'util';
import * as fs from 'fs';

const code = fs.readFileSync('./index.bs', { encoding: 'utf-8' });

const scanner = new Scanner();
const tokens = scanner.tokenize(code);

console.log(tokens);

const parser = new Parser(tokens);
const { ast } = parser.parse('EOF');
parser.writeAst();

console.log(util.inspect(ast, true, 100, true));

const walker = new Walker(ast);
walker.walk();
walker.addStdFunctions();

walker.writeSource();
