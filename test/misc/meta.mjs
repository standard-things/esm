import __dirname from "../__dirname.js"
import assert from "assert"
import path from "path"

import ma from "../fixture/meta/a.mjs"
import mb from "../fixture/meta/b.mjs"

const isWin = process.platform === "win32"
const fileProtocol = "file:" + (isWin ? "///" : "//")
const reBackSlash = /\\/g

const metaPath = path.resolve(__dirname, "fixture/meta")

const maPath = path.resolve(metaPath, "a.mjs")
const maURL = getURLFromFilePath(maPath)

const mbPath = path.resolve(metaPath, "b.mjs")
const mbURL = getURLFromFilePath(mbPath)

function getURLFromFilePath(filePath) {
  return fileProtocol + filePath.replace(reBackSlash, "/")
}

export default () => {
  assert.deepEqual(ma, { url: maURL })
  assert.strictEqual(Object.getPrototypeOf(ma), null)

  assert.deepEqual(mb, { url: mbURL })
  assert.strictEqual(Object.getPrototypeOf(mb), null)
}
