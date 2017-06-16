import __dirname from "./__dirname.js"
import assert from "assert"
import fs from "fs"
import path from "path"
import { gzip } from "../lib/fs.js"

const fixturePath = path.join(__dirname, "file-extension")
const content = fs.readFileSync(path.join(fixturePath, "a.mjs"))

describe("file extension", () => {
  [".gz", ".js.gz", ".mjs.gz", ".mjs"].forEach((ext) => {
    it(`compiles ${ext} files`, () => {
      const modulePath = path.join(fixturePath, "a" + ext)
      if (ext.includes(".gz")) {
        fs.writeFileSync(modulePath, gzip(content))
      }
      return import(modulePath)
        .then((exported) => {
          assert.deepEqual(exported, { a: "a", b: "b", c: "c" })
        })
        .catch(() => assert.ok(false))
    })
  })
})
