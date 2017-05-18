"use strict";module.export({c:()=>c,d:()=>d});module.export({a:()=>a,b:()=>b},true);const a = 1;
const b = function () {
  return d;
};
let c; // lazy initialization
function d() {
  return b;
};

module.runSetters(c = "c");
