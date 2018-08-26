import process from "process"
import harnessContext from "./context.js"

const { argv, stderr, stdout } = process

const [, , testUrl, isAsync] = argv
const _isAsync = isAsync === "true"

// attach test262 harness onto global scope
harnessContext()

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
    if (!_isAsync) {
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

    const send = JSON.stringify({
      name,
      message: typeof e !== "string" && e.message,
      argv
    })

    stdout.write(send)
  })
  .catch((e) =>
    stderr.write(
      `[last resort catch] something happened in the previous catch block: ${
        e.message
      }}`
    )
  )
