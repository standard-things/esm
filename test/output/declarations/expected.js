module.export([["c",()=>c],["d",()=>d]]);module.export([["a",()=>a],["b",()=>b]],1);const a = "a"
const b = () => d
let c // Lazy initialization.
function d() {
  return b
}

module.runSetters(c = "c")
