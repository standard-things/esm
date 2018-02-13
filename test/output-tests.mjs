import Compiler from "../build/compiler.js"

import assert from "assert"
import fs from "fs-extra"
import globby from "globby"
import path from "path"

const files = globby.sync(["output/**/*.{js,mjs}"])
const tests = files
  .reduce((tests, thePath) => {
    const dirPath = path.dirname(thePath)
    const type = path.basename(thePath).replace(/\.m?js$/, "")

    if (! tests[dirPath]) {
      tests[dirPath] = { __proto__: null }
    }

    tests[dirPath][type] = {
      content: fs.readFileSync(thePath, "utf8"),
      type: path.extname(thePath) === ".mjs" ? "module" : "script"
    }

    return tests
  }, { __proto__: null })

describe("output", () =>
  Object
    .keys(tests)
    .forEach((dirPath) => {
      const name = path.basename(dirPath).split("-").join(" ")
      const test = tests[dirPath]

      it(`compiles ${name} example as expected`, () => {
        const result = Compiler.compile(test.actual.content, {
          type: test.actual.type
        })

        // Remove zero-width joiners and trim trailing whitespace.
        const expected = test.expected.content.trimRight()
        const actual = result.code.replace(/\u200d/g, "").trimRight()

        assert.strictEqual(actual, expected)
      })
    })
)
