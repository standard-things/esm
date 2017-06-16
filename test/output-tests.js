import __dirname from "./__dirname.js"
import assert from "assert"
import { compile } from "../lib/compiler.js"
import files from "./all-files.js"
import path from "path"

const filesToTest = Object.create(null)

Object.keys(files).forEach((absPath) => {
  const code = files[absPath]
  const relPath = path.relative(__dirname, absPath)
  const relParts = relPath.split(path.sep)

  if (relParts[0]  === "output") {
    const testName = relParts[1]
    const testType = path.basename(relParts[2], ".js")

    if (! filesToTest[testName]) {
      filesToTest[testName] = Object.create(null)
    }
    filesToTest[testName][testType] = code
  }
})

describe("output", () => {
  Object.keys(filesToTest).forEach((key) => {
    const data = filesToTest[key]
    const testName = key.split("-").join(" ")

    it(`compiles ${testName} example as expected`, () => {
      // Remove zero-width joiners and trim trailing whitespace.
      const code = compile(data.actual).code
      const actual = code.replace(/\u200d/g, "").trimRight()
      const expected = data.expected.trimRight()
      assert.strictEqual(actual, expected)
    })
  })
})
