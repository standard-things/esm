import assert from "assert"
import * as ns from "../fixture/export/all-multiple.js"

export function check() {
  assert.ok(! ("default" in ns))
}
