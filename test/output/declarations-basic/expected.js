module.export({a:()=>a,b:()=>b,c:()=>c,d:()=>d});var a = 1;
var b = function () {
  return d;
};
var c; // lazy initialization
function d() {
  return b;
};

module.runModuleSetters(c = "c");
