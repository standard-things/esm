import SemVer from "semver"
import assert from "assert"
import execa from "execa"
import globby from "globby"
import { basename, resolve, sep } from "path"
import fs from "fs-extra"
import test262Parser from "test262-parser"

const { execArgv, execPath, versions } = process

const testPath = resolve(".")
const test262Path = resolve(testPath, "vendor/test262/.js-tests")

let nodeVersion = Reflect.has(process.versions, "v8") ? SemVer.major(process.version) : ""

if (execArgv.includes("--harmony")) {
  nodeVersion = "harmony"
} else if (Reflect.has(versions, "chakracore")) {
  nodeVersion = "chakra"
}

function node(args, env) {
  return execa(execPath, args, {
    cwd: testPath,
    env,
    reject: false
  })
}

const nodeArgs = []

if (nodeVersion === "harmony") {
  nodeArgs.push("--harmony")
}

function runEsm(filename, env, args) {
  return node([...nodeArgs, "-r", "esm", filename, ...args], env)
}

function runNodeModFlag(filename, args) {
  return node([
    ...nodeArgs,
    "--experimental-modules",
    "--no-warnings",
    filename,
    ...args
  ])
}

const test262Tests = globby.sync(
  [
    "test/language/export/**/*.js",
    "test/language/import/**/*.js",
    "test/language/module-code/**/*.js",
    "!**/*_FIXTURE.js"
  ],
  {
    absolute: true,
    cwd: test262Path,
    // https://github.com/sindresorhus/globby/issues/38
    transform: (entry) => (sep === "\\" ? entry.replace(/\//g, "\\") : entry)
  }
)

const skiplist = new Map()

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

function loadSkiplist() {
  const content = fs.readFileSync(resolve(test262Path, "../skiplist"), "utf-8")

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

      const fullPath = resolve(test262Path, line)

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

loadSkiplist()

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

function skiplistReason(test) {
  return skiplist.get(test).comment
}

const test262Error = "Test262: This statement should not be evaluated."

// const ESM_OPTIONS = JSON.stringify({ /* mode: "strict" */ })
const ESM_OPTIONS = JSON.stringify({ mode: "all", cjs: false })

describe.only("test262 module tests", function () {
  this.timeout(0)

  test262Tests.forEach(function (test262TestPath, index) {
    const { description } = parseTest(test262TestPath)

    const skip = isSkiplisted(test262TestPath)

    const skipReason = skip ? `| ${skiplistReason(test262TestPath)}` : ""

    const testfunc = skip ? it.skip : it

    const filename = basename(test262TestPath)

    testfunc(
      `[${index}] ${description} (${filename}) ${skipReason}`,
      function () {
        const { isAsync, errorType } = parseTest(test262TestPath)

        // return runMain(resolve(test262Path, "../wrapper.mjs"), [test262TestPath, isAsync])
        return runEsm(resolve(test262Path, "../wrapper.js"), { ESM_OPTIONS }, [
          test262TestPath,
          isAsync
        ]).then((out) => {
          const { stdout, stderr } = out

          // console.log(stdout, stderr)

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
