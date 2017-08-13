import assert from "assert"
import def from "../fixture/export/named.mjs"
import * as ns from "../fixture/export/named.mjs"

export function check() {
  assert.strictEqual(ns.bar, "bar")
  assert.strictEqual(ns.baz, "baz")
  assert.strictEqual(ns.baz2, "baz")
  assert.strictEqual(ns.default, "foo")
  assert.strictEqual(ns.foo, "foo")
  assert.strictEqual(ns.foo2, "foo")
  assert.strictEqual(ns.foo3, "foo")
  assert.strictEqual(def, "foo")
}
