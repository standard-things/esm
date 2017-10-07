import assert from "assert"
import fs from "fs-extra"
import globby from "globby"
import makeRequire from "../../index.js"
import module from "../module.js"
import require from "../require.js"

const trueId = require.resolve("./fixture/options/true")
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
    cjsRequire("./fixture/options/cjs")
    gzRequire("./fixture/options/gz")
    jsRequire("./fixture/options/js")
    mjsRequire("./fixture/options/mjs")
    trueRequire("../js")

    setImmediate(() => {
      assert.ok("this" in global)
      assert.strictEqual(global.this, "undefined")

      const cachePaths = globby.sync(["fixture/options/**/.esm-cache"])
      assert.deepStrictEqual(cachePaths, ["fixture/options/true/.esm-cache"])
      resolve()
    })
  })
