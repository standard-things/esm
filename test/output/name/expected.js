"use strict";module.export({id:()=>id,name:()=>name,foo:()=>foo});const path = require("path");

const id = module.id,
  name = path.basename(__filename);

function foo() {
  return "foo";
}
