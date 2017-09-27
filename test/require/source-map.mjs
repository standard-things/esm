import assert from "assert"
import makeRequire from "../../index.js"
import module from "../module.js"
import path from "path"

const isWin = process.platform === "win32"

const __filename = import.meta.url.slice(isWin ? 8 : 7)
const __dirname = path.dirname(__filename)

const abcFilePath = path.resolve(__dirname, "fixture/export/abc.mjs")
const defFilePath = path.resolve(__dirname, "fixture/export/def.js")

export default () => {
  const keys = ["sourceMap", "sourcemap"]

  keys.forEach((key) => {
    const esmRequire = makeRequire(module, { cjs: true, [key]: true })

    const mod = new module.constructor("<mock>", null)
    mod._compile = (content) => assert.ok(content.includes("sourceMappingURL"))

    delete esmRequire.cache[abcFilePath]
    delete esmRequire.cache[defFilePath]

    esmRequire.extensions[".mjs"](mod, abcFilePath)
    esmRequire.extensions[".js"](mod, defFilePath)
  })
}
