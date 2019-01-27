import assert from "assert"
import { inspect } from "util"
import { getNS } from "./a.js"

const ns = getNS()

assert.strictEqual(inspect(ns), "[Module] { e: <uninitialized> }")
assert.strictEqual(Reflect.isExtensible(ns), true)
assert.strictEqual(Reflect.defineProperty(ns, "ADDED", { value: 1 }), true)
assert.strictEqual(inspect(ns), "[Module] { e: <uninitialized> }")
assert.strictEqual(Reflect.preventExtensions(ns), true)
