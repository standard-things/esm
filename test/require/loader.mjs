import assert from "assert"
import makeRequire from "../../index.js"
import module from "../module.js"
import path from "path"

const isWin = process.platform === "win32"

const __filename = import.meta.url.slice(isWin ? 8 : 7)
const __dirname = path.dirname(__filename)

const abcFilePath = path.resolve(__dirname, "../fixture/export/abc.mjs")
const defFilePath = path.resolve(__dirname, "../fixture/export/def.js")

export default () => {
  const esmRequire = makeRequire(module)

  const abcExpected = {
    a: "a",
    b: "b",
    c: "c",
    default: "default"
  }

  const defExpected = {
    d: "d",
    e: "e",
    f: "f"
  }

  delete esmRequire.cache[abcFilePath]
  delete esmRequire.cache[defFilePath]

  const abcExported = esmRequire("./fixture/export/abc.mjs")
  const defExported = esmRequire("./fixture/export/def.js")
  const defModule = esmRequire.cache[defFilePath]

  assert.deepStrictEqual(abcExported, abcExpected)
  assert.deepStrictEqual(defExported, defExpected)

  assert.ok(defModule)
  assert.strictEqual(defModule.id, defFilePath)
}
