import assert from "assert"
import makeRequire from "../../"
import module from "../module.js"
import path from "path"
import require from "../require.js"

const abcPath = path.resolve("fixture/export/abc.mjs")
const defPath = path.resolve("fixture/export/def.js")

export default () => {
  ["sourceMap", "sourcemap"]
    .forEach((key) => {
      const esmRequire = makeRequire(module, { cjs: true, [key]: true })
      const mod = new module.constructor("<mock>", null)

      mod._compile = (content) => {
        assert.ok(content.includes("sourceMappingURL"))
      }

      delete esmRequire.cache[abcPath]
      delete esmRequire.cache[defPath]

      esmRequire.extensions[".mjs"](mod, abcPath)
      mod.exports = {}
      esmRequire.extensions[".js"](mod, defPath)
    })
}
