import assert from "assert"
import module from "./repl/module.js"
import repl from "repl"
import Runtime from "../build/runtime.js"
import vm from "vm"

describe("Node REPL", () => {
  it("should work with global context", (done) => {
    const r = repl.start({ useGlobal: true })

    r.context.module.exports = {}
    Runtime.enable(r.context.module)

    assert.strictEqual(typeof assertStrictEqual, "undefined")

    r.eval(
      'import { strictEqual as assertStrictEqual } from "assert"',
      null, // Context.
      "repl",
      () => {
        // Use the globally defined assertStrictEqual to test itself!
        assertStrictEqual(typeof assertStrictEqual, "function")
        done()
      }
    )
  })

  it("should work with non-global context", (done) => {
    const r = repl.start({ useGlobal: false })
    const context = vm.createContext({ module })

    module.exports = {}
    Runtime.enable(module)

    r.eval(
      'import { strictEqual } from "assert"',
      context,
      "repl",
      () => {
        // Use context.strictEqual to test itself!
        context.strictEqual(typeof context.strictEqual, "function")
        done()
      }
    )
  })
})
