import assert from "assert"
import * as fsNs from "fs"
import mock from "mock-require"
import * as pathNs from "path"
import requireInject from "require-inject"

let error
let pass = false
let threw = false

const mockFs = {
  default: "fs",
  mocked: true
}

const mockPath = {
  default: "path",
  mocked: true
}

const mockReal2 = {
  default: "mock2",
  mocked: true
}

Reflect.defineProperty(mockPath, "__esModule", {
  __proto__: null,
  value: true
})

Reflect.defineProperty(mockReal2, "__esModule", {
  __proto__: null,
  value: true
})

mock("fs", "./fs.js")
mock("./real1.js", "./mock1.js")

import("./load.js")
  .then((ns) => {
    const expected = {
      fs: mockFs,
      path: pathNs,
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
      path: mockPath,
      "./real2.js": mockReal2
    })

    expected.path = mockPath
    expected.real2 = mockReal2

    assert.deepEqual(exported, expected)
  })
  .then(() =>
    Promise
      .all([
        import("fs")
          .then((ns) => assert.deepEqual(ns, mockFs)),
        import("path")
          .then((ns) => assert.strictEqual(ns, pathNs))
      ])
  )
  .then(() => {
    mock.stopAll()

    return Promise
      .all([
        import("fs")
          .then((ns) => assert.strictEqual(ns, fsNs)),
        import("path")
          .then((ns) => assert.strictEqual(ns, pathNs))
      ])
  })
  .then(() => {
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
