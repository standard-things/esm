module.export({id:()=>id,name:()=>name,foo:()=>foo});var path = require("path");

var id = module.id,
  name = path.basename(__filename);

function foo() {
  return "foo";
}
