import __dirname from "./__dirname.js"
import assert from "assert"
import compiler from "../build/compiler.js"
import files from "./all-files.js"
import path from "path"

const tests = Object.create(null)

Object.keys(files).forEach((absPath) => {
  const relPath = path.relative(__dirname, absPath)
  const relParts = relPath.split(path.sep)

  if (relParts[0]  === "output") {
    const code = files[absPath]
    const name = relParts[1]
    const type = path.basename(relParts[2], ".js")

    if (! tests[name]) {
      tests[name] = Object.create(null)
    }
    tests[name][type] = code
  }
})

describe("output", () => {
  Object.keys(tests).forEach((name) => {
    const test = tests[name]
    name = name.split("-").join(" ")

    it(`compiles ${name} example as expected`, () => {
      // Remove zero-width joiners and trim trailing whitespace.
      const code = compiler.compile(test.actual).code
      const actual = code.replace(/\u200d/g, "").trimRight()
      const expected = test.expected.trimRight()
      assert.strictEqual(actual, expected)
    })
  })
})
