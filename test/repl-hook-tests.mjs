import Entry from "../build/entry.js"
import Module from "module"
import Runtime from "../build/runtime.js"

import assert from "assert"
import createNamespace from "./create-namespace.js"
import fs from "fs-extra"
import path from "path"
import repl from "repl"
import require from "./require.js"
import vm from "vm"

const isWin = process.platform === "win32"

const esmPath = path.resolve("../esm.js")
const indexPath = path.resolve("../index.js")
const pkgPath = path.resolve("../package.json")

const fileProtocol = "file://" + (isWin ? "/" : "")
const { parent } = require.cache[indexPath]

const pkgIndex = parent.children.findIndex((child) => child.filename === indexPath)
const pkgJSON = fs.readJSONSync(pkgPath)
const pkgURL = fileProtocol + pkgPath.replace(/\\/g, "/")

const SHARED_SYMBOL = Symbol.for("esm\u200D@" + pkgJSON.version + ":shared")

const shared = require(SHARED_SYMBOL)

describe("REPL hook tests", () => {
  let context

  before(() => {
    const argv = process.argv.slice()

    context = vm.createContext({
      module: new Module("<repl>")
    })

    process.argv = argv.slice(0, 1)
    Reflect.deleteProperty(require.cache, esmPath)
    Reflect.deleteProperty(require.cache, indexPath)

    const sharedModule = shared.module
    const { envIsREPL } = sharedModule

    shared.module.envIsREPL = () => true
    context.module.require(indexPath)

    process.argv = argv
    Reflect.deleteProperty(require.cache, esmPath)
    Reflect.deleteProperty(require.cache, indexPath)

    sharedModule.envIsREPL = envIsREPL
    parent.children.splice(pkgIndex, 1)
    parent.require(indexPath)
  })

  it("should work with a global context", () => {
    const r = repl.start({ useGlobal: true })
    const mod = r.context.module

    Reflect.setPrototypeOf(mod, Module.prototype)

    const entry = Entry.get(mod)

    entry.addBuiltinModules = () => {}
    entry.require = require
    entry.runtimeName = "_"

    Runtime.enable(entry, {})

    assert.strictEqual(typeof globalAssert, "undefined")

    const code = 'import { default as globalAssert } from "assert"'

    r.eval(code, null, "repl", () => {
      assert.strictEqual(typeof globalAssert, "function")
    })

    r.close()
  })

  it("should recover from import errors", () => {
    const r = repl.start({
      eval(code, callback) {
        let error = null

        try {
          vm.createScript(code)
            .runInContext(context, { displayErrors: false })
        } catch (e) {
          error = e
        }

        callback(error)
      }
    })

    r.eval('import { NOT_EXPORTED } from "path"', ({ message }) => {
      r.eval('import { join } from "path"', (error2) => {
        assert.ok(message.includes("does not provide an export"))
        assert.strictEqual(error2, null)
      })
    })

    r.close()
  })

  it("should work with a non-global context", function () {
    const r = repl.start({})
    const code = 'import { default as localAssert } from "assert"'

    assert.strictEqual(typeof context.localAssert, "undefined")

    r.context = context
    r.eval(code, context, "repl", () => {
      assert.strictEqual(typeof context.localAssert, "function")
    })

    r.close()
  })

  it("should use a plain object for `module.exports`", function () {
    const r = repl.start({})
    const code = "var exports = module.exports"

    r.context = context
    r.eval(code, context, "repl", () => {
      assert.strictEqual(Reflect.getPrototypeOf(context.exports), Object.prototype)
    })

    r.close()
  })

  it("should support importing `.json` files", function (done) {
    const r = repl.start({})

    const code = [
      'import static from "' + pkgURL + '"',
      'var dynamic = import("' + pkgURL + '")'
    ].join("\n")

    r.context = context
    r.eval(code, context, "repl", () => {
      context.dynamic
        .then((dynamic) => {
          const pkgNs = createNamespace(Object.assign({
            default: pkgJSON
          }, pkgJSON))

          assert.deepStrictEqual(dynamic, pkgNs)
          assert.deepStrictEqual(context.static, pkgJSON)
        })
        .then(done)
        .catch(done)
    })

    r.close()
  })
})
