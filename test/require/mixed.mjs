import assert from "assert"
import fs from "fs-extra"
import globby from "globby"
import makeRequire from "../../index.js"
import module from "../module.js"
import path from "path"

const isWin = process.platform === "win32"

const __filename = import.meta.url.slice(isWin ? 8 : 7)
const __dirname = path.dirname(__filename)

const cjsDirPath = path.resolve(__dirname, "../fixture/options/cjs")
const cjsFilePath = path.resolve(cjsDirPath, "index.mjs")

const trueId = path.resolve(__dirname, "../fixture/options/true/id")
const trueMod = new module.constructor(trueId, null)
trueMod.filename = trueMod.id

export default () =>
  new Promise((resolve) => {
    const trueRequire = makeRequire(trueMod, true)
    const allRequire = makeRequire(module, { esm: "all" })
    const cjsRequire = makeRequire(module, { cjs: true })
    const gzRequire = makeRequire(module, { gz: true })
    const jsRequire = makeRequire(module, { esm: "js" })
    const mjsRequire = makeRequire(module, { esm: "mjs" })

    allRequire("./fixture/options/all")

    assert.ok("this" in global)
    assert.strictEqual(global.this, "undefined")

    delete cjsRequire.cache[cjsFilePath]

    const cjsExports = cjsRequire(cjsDirPath)
    const cjsModule = cjsRequire.cache[cjsFilePath]

    assert.ok(cjsModule)
    assert.strictEqual(cjsModule.id, cjsFilePath)
    assert.deepEqual(cjsExports, { __dirname: cjsDirPath })

    const exports = [
      gzRequire("./fixture/options/gz"),
      jsRequire("./fixture/options/js"),
      mjsRequire("./fixture/options/mjs"),
      trueRequire("../js")
    ]

    exports.forEach((exported) => assert.ok(exported))

    setImmediate(() => {
      const cachePaths = globby.sync(["fixture/options/**/.esm-cache"])
      assert.deepEqual(cachePaths, ["fixture/options/true/.esm-cache"])
      resolve()
    })
  })
