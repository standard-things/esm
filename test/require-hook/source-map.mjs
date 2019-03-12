import Module from "module"

import assert from "assert"
import makeRequire from "../../index.js"
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
    const { cache, extensions } = makeRequire(module, {
      force: true,
      [name]: true
    })

    const assertSourceMappingURL = (filename, expected) => {
      const mod = new Module("<mock>")

      mod._compile = (content) => {
        assert.strictEqual(content.includes("sourceMappingURL"), expected)
      }

      mod.exports = {}

      Reflect.deleteProperty(cache, filename)
      extensions[".js"](mod, filename)
    }

    assertSourceMappingURL(defPath, false)
    assertSourceMappingURL(dynPath, true)
  }
}
