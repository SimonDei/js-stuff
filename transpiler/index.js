import Scanner from './tokenizer.js';
import Parser from './parser.js';
import Walker from './walker.js';
import * as util from 'util';

const code = `
function mainCb takes age returns nothing
    call log(age)
    
    return age
endfunction

function myFunction takes nothing returns nothing
    local x = 10
    
    if x > 8 then
        set x = 5
    else
        set x = 15
    endif
    
    call test(10, function mainCb)
    
    loop
        set x = 10
    
        exitwhen x > 6
    endloop

    return x
endfunction
`;

const scanner = new Scanner();
const tokens = scanner.tokenize(code);

console.log(tokens);

const parser = new Parser(tokens);
const { ast } = parser.parse('EOF');

console.log(util.inspect(ast, true, 100, true));

const walker = new Walker(ast);
walker.walk();

console.log(walker.getSource());
