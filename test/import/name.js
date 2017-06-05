import assert from "assert"
import path from "path"

const id = module.id;
const name = path.basename(__filename)

export function check() {
  assert.strictEqual(id.split("/").pop(), "name.js")
  assert.strictEqual(name, "name.js")
}
