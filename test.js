let tmpl = `
  <set reisetage = 0 />
  
  <function name="updateVerpflegungen" access="public" returntype="void">
    <set verpflegungenContainer = htmx.find('#reisekosten_verpflegungen') />
    <set anreisetagInput = htmx.find('#reisekosten_ankunftszeit_date') />
    
    <if len(verpflegungenContainer.children) > reisetage>
      <while condition="len(verpflegungenContainer.children) > reisetage">
        <set verpflegungenContainer.removeChild(verpflegungenContainer.lastChild) />
      </while>
      <return />
    </if>
    
    <set prototype = verpflegungenContainer.dataset.prototype />
    
    <loop from="len(verpflegungenContainer.children)" to="reisetage" index="i">
      <set datum = new Date(anreisetagInput.value) />
      <set datum.setDate(datum.getDate() + i) />
      
      <set verpflegungenContainer.insertAdjacentHTML('beforeend', prototype
        .replaceAll('__name__label__', Intl.DateTimeFormat('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).format(datum))
        .replaceAll('__name__', i.toString())) />
    </loop>
  </function>
  
  <function name="calculateReisetage" access="public" returntype="void">
    <set anreisetagInput = htmx.find('#reisekosten_ankunftszeit_date') />
    <set abreisetagInput = htmx.find('#reisekosten_abreisezeit_date') />
    
    <if !abreisetagInput.value || !anreisetagInput.value>
      <set reisetage = 0 />
      <set updateVerpflegungen() />
    </if>
    
    <set startOfDayAbreise = new Date(abreisetagInput.value) />
    <set startOfDayAbreise.setHours(0, 0, 0, 0) />
    
    <set startOfDayAnreise = new Date(anreisetagInput.value) />
    <set startOfDayAnreise.setHours(0, 0, 0, 0) />
    
    <set reisetage = abs(floor((startOfDayAbreise.getTime() - startOfDayAnreise.getTime()) / (24 * 60 * 60 * 1000))) + 1 />
    <set updateVerpflegungen() />
  </function>
`;

const functionRegex = /<function(?<args>[^>]+>[^>]+)>(?<inner>[\s\S]+?)<\/function>/gui;
const argumentRegex = /<argument(?<args>[\s\S]+?)(?:\/>|>)/gui;
const ifRegex = /<if(?<condition>[^>]+>[^>]+)>(?<inner>[\s\S]+?)<\/if>/gui;
const whileRegex = /<while(?<args>[^>]+>[^>]+)>(?<inner>[\s\S]+?)<\/while>/gui
const loopRegex = /<loop(?<args>[^>]+?)>(?<inner>[\s\S]+?)<\/loop>/gui;
const breakRegexp = /<break ?(?:\/>|>)/gui;
const throwRegexp = /<throw(?<args>[\s\S]+?)(?:\/>|>)/gui;
const tryRegexp = /<try>(?<inner>[\s\S]+?)<\/try>/gui;
const catchRegexp = /<catch>(?<inner>[\s\S]+?)<\/catch>/gui;
const setRegex = /<set(?<args>[^\/>]+?)(?:\/>|>)/gui;
const returnRegex = /<return(?<args>[^\/>]+?)(?:\/>|>)/gui;
const dumpRegex = /<dump(?<args>[^\/>]+?)(?:\/>|>)/gui;

function parseArgs(argsString) {
  const args = {};
  argsString.replace(/(?<key>\w+)="(?<value>[^"]+)"/gui, (match, key, value) => {
    args[key] = value;
  });
  return args;
}

function parseTemplate(template) {
  return template.replace(functionRegex, (match, args, inner) => {
    const argsObj = parseArgs(args);
    let text = `function ${argsObj.name}(`;

    const atleastOneArg = argumentRegex.test(inner);
    inner = inner.replace(argumentRegex, (match, args) => {
      const argsObj = parseArgs(args);
      text += `${argsObj.name}`;
      if (argsObj.default) {
        text += ` = ${argsObj.default}`;
      }
      text += ', ';
      return '';
    });

    if (atleastOneArg) {
      text = text.slice(0, -2);
    }
    return text + `) {${inner}}`;
  })
  .replace(ifRegex, (match, condition, inner) => {
    return `if (${condition.trim()}) {${inner}}`;
  })
  .replace(whileRegex, (match, args, inner) => {
    const argsObj = parseArgs(args);
    return `while (${argsObj.condition}) {${inner}}`;
  })
  .replace(loopRegex, (match, args, inner) => {
    const argsObj = parseArgs(args);
    if (argsObj.item && argsObj.array) {
      return `for (const ${argsObj.item} of ${argsObj.array}) {${inner}}`;
    }
    if (argsObj.from && argsObj.to && argsObj.index) {
      return `for (let ${argsObj.index} = ${argsObj.from}; ${argsObj.index} < ${argsObj.to}; ${argsObj.index}++) {${inner}}`;
    }
  })
  .replace(throwRegexp, (match, args) => {
    const argsObj = parseArgs(args);
    return 'throw new Error(`' + argsObj.message + '`);';
  })
  .replace(breakRegexp, 'break;')
  .replace(tryRegexp, (match, inner) => {
    const catchContext = catchRegexp.exec(inner);
    if (catchContext) {
      return `try {${inner.replace(catchRegexp, '')}} catch {${parseTemplate(catchContext.groups.inner)}}`;
    }
    return `try {${inner}} catch {}`;
  })
  .replace(setRegex, (match, args) => {
    return `${args.trim()};`;
  })
  .replace(returnRegex, (match, args) => {
    return `return ${args.trim()};`;
  })
  .replace(dumpRegex, (match, args) => {
    const argsObj = parseArgs(args);
    return `console.log(${argsObj.var});`;
  });
}

console.log(parseTemplate(tmpl));

