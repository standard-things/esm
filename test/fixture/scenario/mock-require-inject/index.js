import assert from "assert"
import mock from "mock-require"
import requireInject from "require-inject"

mock("./real1.js", "./mock1.js")

import("./load.js")
  .then((ns) => {
    const exported = requireInject("./load.js", {
      "./real2.js": "mock2"
    })

    assert.deepEqual(ns, { real1: "mock1", real2: "real2" })
    assert.deepEqual(exported, { real1: "mock1", real2: "mock2" })
  })
