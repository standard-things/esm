const path = require("path");

export const id = module.id,
  name = path.basename(__filename);

export function foo() {
  return "foo";
}
