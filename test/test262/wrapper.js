import { error, log } from "console"

import fs from "fs-extra"
import path from "path"
import test262Parser from "test262-parser"
import vm from "vm"

const MAX_WAIT = 1000
const [,, testFilename, isAsync] = process.argv

const testPath = path.resolve("../vendor/test262")
const harnessPath = path.resolve(testPath, "harness")

const harnessFilenames = [
  path.resolve(harnessPath, "assert.js"),
  path.resolve(harnessPath, "doneprintHandle.js"),
  path.resolve(harnessPath, "fnGlobalObject.js"),
  path.resolve(harnessPath, "sta.js")
]

function waitForAsyncTest() {
  const started = Date.now()

  return new Promise(function check(resolvePromise, rejectPromise) {
    const waited = Date.now() - started

    if (_message) {
      return resolvePromise()
    } else if (waited > MAX_WAIT) {
      return rejectPromise("test262: async test timed out.")
    }

    setTimeout(() => check(resolvePromise, rejectPromise), 100)
  })
}

let _message

global.print = function print(value) {
  _message = value
}

// Suppress unhandled `Promise` rejection warnings.
process.on("unhandledRejection", () => {})

for (const harnessFilename of harnessFilenames) {
  const {
    contents
  } = test262Parser.parseFile(fs.readFileSync(harnessFilename, "utf-8"))

  new vm.Script(contents).runInThisContext()
}

import(testFilename)
  .then(() => {
    if (isAsync === "true") {
      return waitForAsyncTest()
        .then(() => {
          if (_message !== "Test262:AsyncTestComplete") {
            throw _message
          }
        })
    }
  })
  .catch((e) => {
    let message = ""
    let name = ""

    const type = typeof e

    if (type === "string") {
      name = e
    } else if (type === "object" &&
        e !== null) {
      const { constructor } = e
      const errorMessage = e.message
      const errorName = constructor ? constructor.name : e.name

      if (errorMessage !== void 0) {
        message = String(errorMessage)
      }

      if (errorName !== void 0) {
        name = String(errorName)
      }
    }

    log(JSON.stringify({
      argv: process.argv,
      name,
      message
    }))
  })
  .catch((e) => {
    error(
      "[last resort catch] something happened in the previous catch block:",
      e
    )
  })
