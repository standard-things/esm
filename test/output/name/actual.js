var path = require("path");

export var id = module.id,
  name = path.basename(__filename);

export function foo() {
  return "foo";
}
