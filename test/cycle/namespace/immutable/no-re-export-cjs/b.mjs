import assert from "assert"
import { inspect } from "util"
import { getNS } from "./a.mjs"

const ns = getNS()

assert.strictEqual(inspect(ns), "[Module] { e: <uninitialized> }")
assert.strictEqual(Reflect.isExtensible(ns), false)
assert.strictEqual(Reflect.defineProperty(ns, "ADDED", { value: 1 }), false)
assert.strictEqual(inspect(ns), "[Module] { e: <uninitialized> }")
assert.strictEqual(Reflect.preventExtensions(ns), true)
