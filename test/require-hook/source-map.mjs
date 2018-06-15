import Module from "module"

import assert from "assert"
import makeRequire from "../../"
import module from "../module.js"
import path from "path"

const abcPath = path.resolve("fixture/export/abc.mjs")
const defPath = path.resolve("fixture/export/def.js")
const dynPath = path.resolve("fixture/import/dynamic.js")

export default () => {
  ["sourceMap", "sourcemap"]
    .forEach((name) => {
      const esmRequire = makeRequire(module, { [name]: true })
      const { cache, extensions } = esmRequire
      const mod = new Module("<mock>")

      mod._compile = (content) => {
        assert.ok(content.includes("sourceMappingURL"))
      }

      Reflect.deleteProperty(cache, abcPath)
      extensions[".mjs"](mod, abcPath)

      mod.exports = {}
      Reflect.deleteProperty(cache, defPath)
      extensions[".js"](mod, defPath)

      mod.exports = {}
      Reflect.deleteProperty(cache, dynPath)
      extensions[".js"](mod, dynPath)
    })
}
