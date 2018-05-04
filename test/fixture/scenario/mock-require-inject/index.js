import assert from "assert"
import mock from "mock-require"
import requireInject from "require-inject"

mock("./real1.js", "./mock1.js")

let error
let pass = false
let threw = false

const mock2 = {
  default: "mock2",
  mocked: true
}

Reflect.defineProperty(mock2, "__esModule", {
  __proto__: null,
  value: true
})

import("./load.js")
  .then((ns) => {
    const expected = {
      real1: {
        default: "mock1",
        mocked: true
      },
      real2: {
        default: "real2"
      }
    }

    assert.deepEqual(ns, expected)

    const exported = requireInject("./load.js", {
      "./real2.js": mock2
    })

    expected.real2 = mock2

    assert.deepEqual(exported, expected)

    pass = true
  })
  .catch((e) => {
    error = e
    threw = true
  })

setTimeout(() => {
  if (threw) {
    throw error
  }

  assert.ok(pass)
}, 2000)
