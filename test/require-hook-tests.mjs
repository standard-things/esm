import Module from "module"

import assert from "assert"
import path from "path"
import requireHook from "../build/esm.js"

const module = Module._cache[path.resolve("./require-hook-tests.mjs")]

describe("require hook", () => {
  it("should create a require function that can load ESM", () => {
    const esmRequire = requireHook(module)
    const ns = esmRequire("./fixture/export/abc.mjs")

    const abcNs = {
      a: "a",
      b: "b",
      c: "c",
      default: "default"
    }

    assert.deepEqual(ns, abcNs)
  })
})
