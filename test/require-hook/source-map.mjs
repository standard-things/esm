import assert from "assert"
import makeRequire from "../../"
import module from "../module.js"
import path from "path"

const abcPath = path.resolve("fixture/export/abc.mjs")
const defPath = path.resolve("fixture/export/def.js")
const dynPath = path.resolve("fixture/import/dynamic.js")

export default () => {
  ["sourceMap", "sourcemap"]
    .forEach((key) => {
      const esmRequire = makeRequire(module, { [key]: true })
      const { cache, extensions } = esmRequire
      const mod = new module.constructor("<mock>", null)

      mod._compile = (content) => {
        assert.ok(content.includes("sourceMappingURL"))
      }

      Reflect.deleteProperty(cache, abcPath)
      extensions[".mjs"](mod, abcPath)

      mod.exports = {}
      Reflect.deleteProperty(cache, dynPath)
      extensions[".js"](mod, dynPath)

      mod._compile = (content) => {
        assert.strictEqual(content.includes("sourceMappingURL"), false)
      }

      mod.exports = {}
      Reflect.deleteProperty(cache, defPath)
      extensions[".js"](mod, defPath)
    })
}
