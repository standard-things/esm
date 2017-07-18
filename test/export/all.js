import assert from "assert"
import def, { d, e, f as g } from "../fixture/export/all-with-default.js"
import * as ns from "../fixture/export/all-without-default.js"

export function check() {
  assert.strictEqual(d, "d")
  assert.strictEqual(e, "e")
  assert.strictEqual(g, "f")
  assert.strictEqual(def, "default")
  assert.deepEqual(ns, { d: "d", e: "e", f: "f" })
}
