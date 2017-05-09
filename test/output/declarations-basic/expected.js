"use strict";module.export({a:()=>a,b:()=>b,c:()=>c,d:()=>d});const a = 1;
const b = function () {
  return d;
};
let c; // lazy initialization
function d() {
  return b;
};

module.runSetters(c = "c");
