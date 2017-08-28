import assert from "assert"
import execa from "execa"
import path from "path"

const isWin = process.platform === "win32"

const NODE_BIN = path.resolve("./env/prefix", isWin ? "node.exe" : "bin/node")

describe("module.runMain hook", () => {
  it("should work with Node -r and --require options", () => {
    const abcNs = {
      a: "a",
      b: "b",
      c: "c",
      default: "default"
    }

    const options = ["-r", "--require"]

    return Promise.all(options.map((option) =>
      execa(NODE_BIN, [
        option, "../build/esm.js",
        "./main/main.mjs"
      ])
    ))
    .then((results) => {
      results.forEach((result) => {
        const ns = JSON.parse(result.stdout.split("\n").pop())
        assert.deepEqual(ns, abcNs)
      })
    })
  })
})
