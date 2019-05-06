import assert from "assert"
import createNamespace from "../../../create-namespace.js"
import * as fsNs from "fs"
import mock from "mock-require"
import * as pathNs from "path"
import requireInject from "require-inject"
import * as utilNs from "util"

let error
let pass = false
let threw = false

const mockFs = {
  default: "fs"
}

const mockPath = {
  default: "path"
}

const mockReal2 = {
  default: "mock2"
}

const mockReal3 = {
  default: "mock3"
}

const mockUtil = {
  default: "util"
}

const hybridMocks = [
  mockPath,
  mockReal2,
  mockReal3
]

for (const mock of hybridMocks) {
  Reflect.defineProperty(mock, "__esModule", {
    value: true
  })
}

mock("fs", "./fs.js")
mock("./real1.js", "./mock1.js")
mock("./real2.js", mockReal2)
mock("util", "./util.js")

import("./load.js")
  .then((ns) => {
    const expected = {
      fs: createNamespace(mockFs),
      path: pathNs,
      real1: createNamespace({
        default: "mock1"
      }),
      real2: createNamespace(mockReal2),
      real3: createNamespace({
        default: "real3"
      }),
      util: createNamespace(mockUtil)
    }

    assert.deepEqual(ns, createNamespace(expected))

    const exported = requireInject("./load.js", {
      path: mockPath,
      "./real3.js": mockReal3
    })

    expected.path = createNamespace(mockPath)
    expected.real3 = createNamespace(mockReal3)

    assert.deepEqual(exported, expected)
  })
  .then(() =>
    Promise
      .all([
        import("fs")
          .then((ns) => assert.deepEqual(ns, createNamespace(mockFs))),
        import("path")
          .then((ns) => assert.strictEqual(ns, pathNs)),
        import("util")
          .then((ns) => assert.deepEqual(ns, createNamespace(mockUtil)))
      ])
  )
  .then(() => {
    mock.stopAll()

    return Promise
      .all([
        import("fs")
          .then((ns) => assert.strictEqual(ns, fsNs)),
        import("path")
          .then((ns) => assert.strictEqual(ns, pathNs)),
        import("util")
          .then((ns) => assert.strictEqual(ns, utilNs))
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
