"use strict";module.export({value:()=>localValue,run:()=>run});let localValue = "original";

function run(code) {
  return module.runSetters(eval(code));
};
