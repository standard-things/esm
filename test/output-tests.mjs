import Compiler from "../build/compiler.js"

import assert from "assert"
import fs from "fs-extra"
import globby from "globby"
import path from "path"

const SCRIPT = 1
const MODULE = 2

const files = globby.sync("output/**/*.{js,mjs}", {
  transform: path.normalize
})

const tests = files
  .reduce((tests, thePath) => {
    const dirPath = path.dirname(thePath)
    const kind = path.basename(thePath).replace(/\.m?js$/, "")

    if (! tests[dirPath]) {
      tests[dirPath] = {}
    }

    tests[dirPath][kind] = {
      content: fs.readFileSync(thePath, "utf8"),
      sourceType: path.extname(thePath) === ".mjs" ? MODULE : SCRIPT
    }

    return tests
  }, {})

describe("output tests", () => {
  const dirPaths = Object.keys(tests)

  for (const dirPath of dirPaths) {
    const name = path.basename(dirPath).split("-").join(" ")
    const test = tests[dirPath]

    it(`compiles ${name} example as expected`, () => {
      const result = Compiler.compile(test.actual.content, {
        sourceType: test.actual.sourceType
      })

      const expected = test.expected.content
        .trimRight()

      // Remove zero-width joiners and trim lines.
      const actual = result.code
        .replace(/\u200D/g, "")
        .replace(/[ \t]+$/gm, "")
        .trimRight()

      assert.strictEqual(actual, expected)
    })
  }
})
