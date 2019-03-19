import fs from "fs-extra"
import path from "path"
import vm from "vm"

const MAX_WAIT = 1000
const [,, testFilename, isAsync] = process.argv

const testPath = path.resolve("../vendor/test262")
const harnessPath = path.resolve(testPath, "harness")

const harnessFilenames = [
  "assert.js",
  "compareArray.js",
  "doneprintHandle.js",
  "fnGlobalObject.js",
  "sta.js"
]

function waitForAsyncTest() {
  const started = Date.now()

  return new Promise(function check(resolvePromise, rejectPromise) {
    const waited = Date.now() - started

    if (_message !== void 0) {
      return resolvePromise()
    } else if (waited > MAX_WAIT) {
      return rejectPromise("test262: async test timed out.")
    }

    setTimeout(() => check(resolvePromise, rejectPromise), 100)
  })
}

let _message

global.print = function print(value) {
  _message = String(value)
}

for (const filename of harnessFilenames) {
  vm.runInThisContext(fs.readFileSync(path.resolve(harnessPath, filename), "utf-8"))
}

// Suppress logging.
const { error, log } = console
const noop = () => {}

Object.keys(console).forEach((name) => {
  if (typeof console[name] === "function") {
    console[name] = noop
  }
})

// Suppress unhandled promise rejection warnings.
process.on("unhandledRejection", () => {})

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

      const errorName = constructor === void 0
        ? e.name
        : constructor.name

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
