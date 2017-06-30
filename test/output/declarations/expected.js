_.export([["c",()=>c],["d",()=>d]]);_.export([["a",()=>a],["b",()=>b]],1);const a = "a"
const b = () => d
let c // Lazy initialization.
function d() {
  return b
}

_.runSetters(c = "c")
