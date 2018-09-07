import SemVer from "semver"

import assert from "assert"
import execa from "execa"
import fs from "fs-extra"
import globby from "globby"
import path from "path"
import test262Parser from "test262-parser"

const fixturePath = path.resolve("test262")
const skiplistPath = path.resolve(fixturePath, "skiplist")
const testPath = path.resolve(".")
const test262Path = path.resolve("vendor/test262")
const wrapperPath = path.resolve(fixturePath, "wrapper.js")

let nodeVersion = Reflect.has(process.versions, "v8")
  ? SemVer.major(process.version)
  : ""

if (process.execArgv.includes("--harmony")) {
  nodeVersion = "harmony"
} else if (Reflect.has(process.versions, "chakracore")) {
  nodeVersion = "chakra"
}

const nodeArgs = []

if (nodeVersion === "harmony") {
  nodeArgs.push("--harmony")
}

const skiplist = new Map

const test262Tests = globby.sync(
  [
    "test/language/export/**/*.js",
    "test/language/import/**/*.js",
    "test/language/module-code/**/*.js",
    "!**/*_FIXTURE.js"
  ],
  {
    absolute: true,
    cwd: test262Path
  }
)

function isSkiplisted(test) {
  const item = skiplist.get(test)

  if (! item) {
    return false
  }

  if (item.skiplistFlags.includes(`@${nodeVersion}`) || item.skiplistFlags.length === 0) {
    return true
  }

  return false
}

function loadSkiplist() {
  const content = fs.readFileSync(skiplistPath, "utf-8")

  content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .reduce((comment, line) => {
      if (line.startsWith("#")) {
        if (comment) {
          throw new Error(
            `The skiplist contains multiple comments in consecutive rows: "${comment}" and "${line}". This is not allowed.`
          )
        }

        return line
      }

      if (! comment) {
        throw new Error(
          `A reason for skipping is required! None was given for: "${line}".`
        )
      }

      const skiplistFlags = comment.match(/@[a-z0-9-]*/g) || []

      const fullPath = path.resolve(test262Path, line)

      if (isSkiplisted(fullPath)) {
        throw new Error(`Same entry in skiplist already exists for: "${line}".`)
      }

      comment = comment.slice(1).trimLeft()

      skiplist.set(fullPath, {
        comment,
        skiplistFlags
      })

      return null
    }, null)
}

function node(args, env) {
  return execa(process.execPath, args, {
    cwd: fixturePath,
    env,
    reject: false
  })
}

function parseTest(filepath) {
  const rawTest = fs.readFileSync(filepath, "utf-8")

  const {
    attrs: { description, negative, flags }
  } = test262Parser.parseFile(rawTest)

  return {
    description,
    isAsync: flags && flags.async,
    errorType: negative && negative.type
  }
}

function runEsm(filename, env, args) {
  return node([
    ...nodeArgs,
    "-r", "esm",
    filename,
    ...args
  ], env)
}

function skiplistReason(test) {
  return skiplist.get(test).comment
}

loadSkiplist()

const ESM_OPTIONS = JSON.stringify({ mode: "all", cjs: false })

describe.only("test262 module tests", function () {
  this.timeout(0)

  test262Tests.forEach(function (test262TestPath, index) {
    const { description } = parseTest(test262TestPath)

    const skip = isSkiplisted(test262TestPath)

    const skipReason = skip ? `| ${skiplistReason(test262TestPath)}` : ""

    const testfunc = skip ? it.skip : it

    const filename = path.basename(test262TestPath)

    testfunc(
      `[${index}] ${description} (${filename}) ${skipReason}`,
      function () {
        const { isAsync, errorType } = parseTest(test262TestPath)

        return runEsm(wrapperPath, { ESM_OPTIONS }, [
          test262TestPath,
          isAsync
        ]).then(({ stderr, stdout }) => {
          if (stdout) {
            const { name } = JSON.parse(stdout)

            // possible known "supported" test262 constructors:
            // SyntaxError, Test262Error, ReferenceError, TypeError
            assert.strictEqual(errorType, name)
          }

          if (stderr) {
            console.log("stderr ==>", stderr)
            assert.fail("possible test262 Error")
          }
        })
      }
    )
  })
})
