import __dirname from "./__dirname.js"
import assert from "assert"
import fs from "fs"
import { gzipSync } from "zlib"
import path from "path"

const fixturePath = path.join(__dirname, "file-extension")
const content = fs.readFileSync(path.join(fixturePath, "a.mjs"))

describe("file extension", () => {
  [".gz", ".js.gz", ".mjs.gz", ".mjs"].forEach((ext) => {
    it(`compiles ${ext} files`, () => {
      const modulePath = path.join(fixturePath, "a" + ext)
      if (ext.includes(".gz")) {
        fs.writeFileSync(modulePath, gzipSync(content))
      }
      return import(modulePath)
        .then((exported) => {
          assert.deepEqual(exported, { a: "a", b: "b", c: "c" })
        })
        .catch((e) => assert.ifError(e))
    })
  })
})
