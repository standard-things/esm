import assert from "assert"
import def, { a, b, c as d } from "../fixture/export/all-with-default.js"
import * as ns from "../fixture/export/all-without-default.js"

export function check() {
  assert.strictEqual(a, "a")
  assert.strictEqual(b, "b")
  assert.strictEqual(d, "c")
  assert.strictEqual(def, "default")
  assert.deepEqual(ns, { a: "a", b: "b", c: "c" })
}
