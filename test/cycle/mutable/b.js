import assert from "assert"
import { inspect } from "util"
import { getNS } from "./a.js"

const ns = getNS()

assert.strictEqual(inspect(ns), "[Module] {}")
assert.strictEqual(Reflect.isExtensible(ns), true)
assert.strictEqual(Reflect.defineProperty(ns, "b", { value: "b" }), false)
assert.strictEqual(inspect(ns), "[Module] {}")
assert.strictEqual(Reflect.preventExtensions(ns), false)
