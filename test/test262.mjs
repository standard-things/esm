import SemVer from "semver"

import assert from "assert"
import execa from "execa"
import fs from "fs-extra"
import globby from "globby"
import path from "path"
import test262Parser from "test262-parser"

const isChakra = Reflect.has(process.versions, "chakracore")

const fixturePath = path.resolve("test262")
const skiplistPath = path.resolve(fixturePath, "skiplist")
const test262Path = path.resolve("vendor/test262")
const wrapperPath = path.resolve(fixturePath, "wrapper.js")

const skipRegExp = /^(#.*)\n([^#\n].*)/gm
const skipFlagsRegExp = /@[-\w]+/g

const nodeVersion = isChakra
  ? "chakra"
  : String(SemVer.major(process.version))

const skiplist = parseSkiplist(skiplistPath)

const test262Tests = globby.sync([
  "test/language/**/*.js",
  "!**/*_FIXTURE.js"
], {
  absolute: true,
  cwd: test262Path,
  transform: path.normalize
})

function node(args, env) {
  return execa(process.execPath, args, {
    cwd: fixturePath,
    env,
    reject: false
  })
}

function parseSkiplist(filename) {
  const content = fs.readFileSync(filename, "utf-8")
  const result = new Map

  let match

  while ((match = skipRegExp.exec(content))) {
    let flags
    let reason
    let [, comment, filename] = match

    filename = path.resolve(test262Path, filename)

    if (skipFlagsRegExp.test(comment)) {
      flags = comment
        .match(skipFlagsRegExp)
        .map((flag) => flag.slice(1))

      reason = comment
        .slice(1, comment.search(skipFlagsRegExp))
        .trim()
    } else {
      flags = []
      reason = comment
        .slice(1)
        .trim()
    }

    result.set(filename, {
      flags,
      reason
    })
  }

  return result
}

function parseTest(filename) {
  const { attrs } = test262Parser.parseFile(fs.readFileSync(filename, "utf-8"))
  const { features, flags, negative } = attrs
  const description = attrs.description.trim()
  const errorType = negative ? negative.type : void 0
  const isAsync =
    !! (flags && flags.async) ||
    !! (features && features.indexOf("dynamic-import") !== -1)

  return {
    description,
    errorType,
    isAsync
  }
}

function runEsm(filename, args, env) {
  return node([
    "-r", "esm",
    filename, ...args
  ], env)
}

describe("test262 tests", function () {
  this.timeout(0)

  for (const filename of test262Tests) {
    let skipped = skiplist.get(filename)

    if (skipped) {
      const { flags } = skipped

      if (flags.length &&
          flags.indexOf(nodeVersion) === -1) {
        skipped = void 0
      }
    }

    const testData = parseTest(filename)

    const description =
      testData.description +
      " (" + path.basename(filename) + ")" +
      (skipped ? "; " + skipped.reason : "")

    it(description, function () {
      const { isAsync } = testData

      return runEsm(wrapperPath, [
        filename,
        isAsync
      ], { ESM_OPTIONS: "{cjs:0,mode:all}" })
      .then(({ stderr, stdout }) => {
        if (skipped &&
            isAsync) {
          this.skip()
        }

        if (stderr) {
          if (skipped) {
            this.skip()
          }

          assert.fail(stderr)
        }

        if (stdout) {
          const { name } = JSON.parse(stdout)
          const expected = testData.errorType

          // Known test262 constructors:
          // ReferenceError, SyntaxError, Test262Error, TypeError
          if (skipped) {
            if (name !== expected ||
                name !== "SyntaxError") {
              assert.notStrictEqual(name, expected)
            }

            this.skip()
          } else {
            assert.strictEqual(name, expected)
          }
        } else if (skipped) {
          this.skip()
        }
      })
    })
  }
})
