module.export({c:()=>c,d:()=>d});module.export({a:()=>a,b:()=>b},true);const a = 1
const b = () => d
let c // Lazy initialization.
function d() {
  return b
}

module.runSetters(c = "c")
