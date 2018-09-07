import fs from "fs-extra"
import path from "path"
import test262Parser from "test262-parser"
import vm from "vm"

const testPath = path.resolve("../vendor/test262")
const harnessPath = path.resolve(testPath, "harness")

const harnessFilenames = [
  path.resolve(harnessPath, "assert.js"),
  path.resolve(harnessPath, "doneprintHandle.js"),
  path.resolve(harnessPath, "fnGlobalObject.js"),
  path.resolve(harnessPath, "sta.js")
]

const [, , testUrl, isAsync] = process.argv
const _isAsync = isAsync === "true"
const sandbox = vm.createContext(global)

for (const filename of harnessFilenames) {
  const { contents } = test262Parser.parseFile(fs.readFileSync(filename, "utf-8"))

  new vm.Script(contents).runInContext(sandbox)
}

let _msg

// global print function expected by test262
global.print = function print(val) {
  _msg = val
}

const MAX_WAIT = 1000

function waitForAsyncTest() {
  let wait = 0

  return new Promise(function time(res, rej) {
    if (_msg) {
      return res()
    } else if (wait === MAX_WAIT) {
      return rej("test262: async test timed out.")
    }

    setTimeout(() => time(res, rej), (wait += 200))
  })
}

import(testUrl)
  .then(() => {
    if (! _isAsync) {
      return
    }

    return waitForAsyncTest().then(() => {
      if (_msg !== "Test262:AsyncTestComplete") {
        throw _msg
      }
    })
  })
  .catch((e) => {
    const name = typeof e === "string" ? e : e.constructor.name

    console.log(JSON.stringify({
      name,
      message: typeof e !== "string" && e.message,
      argv: process.argv
    }))
  })
  .catch((e) =>
    console.error(
      `[last resort catch] something happened in the previous catch block: ${
        e.message
      }}`
    )
  )
