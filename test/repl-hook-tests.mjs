import Runtime from "../build/runtime.js"

import assert from "assert"
import module from "./fixture/repl/module.mjs"
import repl from "repl"
import vm from "vm"

const context = vm.createContext({ module })

describe("REPL hook", () => {
  it("should work with a global context", (done) => {
    const r = repl.start({ useGlobal: true })
    const code = 'import { default as globalAssert } from "assert"'

    r.context.module.exports = {}
    Runtime.enable(r.context.module)

    assert.strictEqual(typeof globalAssert, "undefined")

    r.eval(code, null, "repl", () => {
      assert.strictEqual(typeof globalAssert, "function")
      done()
    })
  })

  it("should work with a non-global context", (done) => {
    const r = repl.start({})
    const code = 'import { default as localAssert } from "assert"'

    assert.strictEqual(typeof context.localAssert, "undefined")

    r.eval(code, context, "repl", () => {
      assert.strictEqual(typeof context.localAssert, "function")
      done()
    })
  })

  it("should recover from import errors", (done) => {
    const r = repl.start({
      eval(code, callback) {
        let error = null

        try {
          vm.createScript(code)
            .runInContext(context, { displayErrors: false })
        } catch (e) {
          error = e
        }

        callback.call(this, error)
      }
    })

    r.eval('import { bogus } from "path"', function (e) {
      assert.ok(e.message.includes("' does not provide an export named '"))

      this.eval('import { join } from "path"', (e) => {
        assert.strictEqual(e, null)
        done()
      })
    })
  })
})
