import { readFileSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export const mobileRoot=join(dirname(fileURLToPath(import.meta.url)),"..");

export function loadTs(relativePath,{mocks={}}={}){
  const cache=new Map();
  function load(absolutePath){
    const normalized=normalize(absolutePath);
    if(cache.has(normalized)) return cache.get(normalized).exports;
    const source=readFileSync(normalized,"utf8");
    const output=ts.transpileModule(source,{
      compilerOptions:{
        module:ts.ModuleKind.CommonJS,
        target:ts.ScriptTarget.ES2022,
        jsx:ts.JsxEmit.ReactJSX,
        esModuleInterop:true
      },
      fileName:normalized
    }).outputText;
    const module={exports:{}};
    cache.set(normalized,module);
    const localRequire=(specifier)=>{
      if(Object.prototype.hasOwnProperty.call(mocks,specifier)) return mocks[specifier];
      if(specifier.startsWith(".")){
        const base=normalize(join(dirname(normalized),specifier));
        const candidates=extname(base)?[base]:[base+".ts",base+".tsx",join(base,"index.ts")];
        for(const candidate of candidates){
          try{return load(candidate);}catch(error){
            if(error?.code!=="ENOENT") throw error;
          }
        }
        throw new Error("Cannot resolve "+specifier+" from "+normalized);
      }
      throw new Error("Unexpected require "+specifier+" from "+normalized);
    };
    new Function("module","exports","require",output)(module,module.exports,localRequire);
    return module.exports;
  }
  return load(join(mobileRoot,relativePath));
}
