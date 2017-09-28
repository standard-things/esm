import Runtime from "../build/runtime.js"

import assert from "assert"
import module from "./module.js"
import path from "path"
import repl from "repl"
import require from "./require.js"
import vm from "vm"

const isWin = process.platform === "win32"

const __filename = import.meta.url.slice(isWin ? 8 : 7)
const __dirname = path.dirname(__filename)

const pkgPath = path.resolve(__dirname, "../index.js")
const parent = require.cache[pkgPath].parent
const pkgIndex = parent.children.findIndex((child) => child.filename === pkgPath)

describe("REPL hook", () => {
  let context

  before(() => {
    context = vm.createContext({ module: new module.constructor("<repl>") })

    delete require.cache[pkgPath]
    context.module.require(pkgPath)

    delete require.cache[pkgPath]
    parent.children.splice(pkgIndex, 1)
    parent.require(pkgPath)
  })

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

  it("should use a plain object for `module.exports`", (done) => {
    const r = repl.start({})
    const code = "this.exports = module.exports"

    r.eval(code, context, "repl", () => {
      assert.strictEqual(Object.getPrototypeOf(context.exports), Object.prototype)
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
