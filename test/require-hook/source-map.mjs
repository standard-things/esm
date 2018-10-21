import Module from "module"

import assert from "assert"
import makeRequire from "../../"
import module from "../module.js"
import path from "path"

const defPath = path.resolve("fixture/export/def.js")
const dynPath = path.resolve("fixture/import/dynamic.js")

export default () => {
  const optionNames = [
    "sourceMap",
    "sourcemap"
  ]

  for (const name of optionNames) {
    const esmRequire = makeRequire(module, {
      force: true,
      [name]: true
    })

    const { cache, extensions } = esmRequire
    const mod = new Module("<mock>")

    mod._compile = (content) => {
      assert.ok(content.includes("sourceMappingURL"))
    }

    mod.exports = {}
    Reflect.deleteProperty(cache, defPath)
    extensions[".js"](mod, defPath)

    mod.exports = {}
    Reflect.deleteProperty(cache, dynPath)
    extensions[".js"](mod, dynPath)
  }
}
