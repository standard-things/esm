import assert from "assert"
import compiler from "../build/compiler.js"
import fs from "fs"
import globby from "globby"
import helper from "./helper.js"
import path from "path"

const __dirname = helper.__dirname
const files = globby.sync(["output/**/*.js"])
const tests = Object.create(null)

files.forEach((relPath) => {
  const parts = relPath.split(path.sep)
  const name = parts[1]
  const type = path.basename(parts[2], ".js")

  if (! tests[name]) {
    tests[name] = Object.create(null)
  }
  tests[name][type] = fs.readFileSync(relPath, "utf8")
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
