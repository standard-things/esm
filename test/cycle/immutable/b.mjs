import assert from "assert"
import { inspect } from "util"
import { getNS } from "./a.mjs"

const ns = getNS()

assert.strictEqual(inspect(ns), "[Module] { default: <uninitialized> }")
assert.strictEqual(Reflect.isExtensible(ns), true)
assert.strictEqual(Reflect.defineProperty(ns, "b", { value: "b" }), false)
assert.strictEqual(inspect(ns), "[Module] { default: <uninitialized> }")
assert.strictEqual(Reflect.preventExtensions(ns), false)
