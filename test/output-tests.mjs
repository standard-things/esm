import Compiler from "../build/compiler.js"

import assert from "assert"
import fs from "fs-extra"
import globby from "globby"
import path from "path"

const files = globby.sync(["output/**/*.mjs"])
const tests = files
  .reduce((tests, thePath) => {
    const dirPath = path.dirname(thePath)
    const type = path.basename(thePath, ".mjs")

    if (! tests[dirPath]) {
      tests[dirPath] = Object.create(null)
    }

    tests[dirPath][type] = fs.readFileSync(thePath, "utf8")
    return tests
  }, Object.create(null))

describe("output", () =>
  Object
    .keys(tests)
    .forEach((dirPath) => {
      const name = path.basename(dirPath).split("-").join(" ")
      const test = tests[dirPath]

      it(`compiles ${name} example as expected`, () => {
        // Remove zero-width joiners and trim trailing whitespace.
        const result = Compiler.compile(test.actual, { type: "module" })
        const expected = test.expected.trimRight()
        const actual = result.code.replace(/\u200d/g, "").trimRight()

        assert.strictEqual(actual, expected)
      })
    })
)
