import assert from "assert"

import { A, B, C, D, E, F, G, H, I } from "../fixture/export/class-fields.mjs"

export default () => {
  assert.ok(Reflect.has(new A, "a"))
  assert.strictEqual(new B().b, "b")
  assert.strictEqual(Reflect.has(new C, "#c"), false)
  assert.strictEqual(new D().d(), "d")
  assert.ok(Reflect.has(new E, "async"))
  assert.ok(Reflect.has(new F, "get"))
  assert.ok(Reflect.has(new G, "set"))
  assert.ok(Reflect.has(new H, "static"))

  const names = ["async", "get", "set", "static"]

  assert.ok(names.every((name) => Reflect.has(new I, name)))
}
