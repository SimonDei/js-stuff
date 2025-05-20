import Scanner from './tokenizer.js';
import Parser from './parser.js';
// import Walker from './walker.js';
import * as fs from 'fs';

//const userArgs = process.argv.slice(2);
//let typesEnabled = true;

//if (userArgs.length > 0) {
//  if (userArgs.includes('--types')) {
//    typesEnabled = true;
//  }
//}

const code = fs.readFileSync('./index.c', { encoding: 'utf-8' });

const tokens = new Scanner().tokenize(code);

fs.writeFileSync('./tokens.json', '[\n' + tokens.reduce((acc, tok) => acc + `{ "type": "${tok.type}", "value": "${tok.value}", "line": ${tok.line} },\n`, '') + ']\n', { encoding: 'utf-8' });

const ast = new Parser(tokens).parse();

fs.writeFileSync('./ast.json', JSON.stringify(ast, null, 2));

/*
const walker = new Walker(ast, typesEnabled);
walker.walk();
walker.addStdFunctions();
walker.addImportStatements();

fs.writeFileSync('./source.js', walker.getSource(), { encoding: 'utf-8' });
*/
