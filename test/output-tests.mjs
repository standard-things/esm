import assert from "assert"
import compiler from "../build/compiler.js"
import fs from "fs-extra"
import globby from "globby"
import path from "path"

const files = globby.sync(["output/**/*.mjs"])
const tests = files
  .reduce((tests, relPath) => {
    const parts = relPath.split("/")
    const name = parts[1]
    const type = path.basename(parts[2], ".mjs")

    if (! tests[name]) {
      tests[name] = Object.create(null)
    }

    tests[name][type] = fs.readFileSync(relPath, "utf8")
    return tests
  }, Object.create(null))

describe("output", () =>
  Object
    .keys(tests)
    .forEach((name) => {
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
)
