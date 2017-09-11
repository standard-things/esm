import __dirname from "./__dirname.js"
import assert from "assert"
import execa from "execa"
import path from "path"

const isWin = process.platform === "win32"
const NODE_BIN = path.resolve(__dirname, "./env/prefix", isWin ? "node.exe" : "bin/node")

describe("command-line hook", () => {
  it("should not fail on unresolvable command-line arguments", () => {
    const args = [
      "./node_modules/cli",
      "UNRESOLVABLE_VALUE",
      "../index.js"
    ]

    return execa(NODE_BIN, args, {
      cwd: __dirname,
      reject: false
    })
    .then((result) => assert.strictEqual(result.stderr, ""))
  })

  it("should inspect JSON encoded command-line arguments", () => {
    const args = [
      "./node_modules/cli",
      '{"r":"../index.js"}'
    ]

    return execa(NODE_BIN, args, {
      cwd: __dirname,
      reject: false
    })
    .then((result) => {
      const abcNs = {
        a: "a",
        b: "b",
        c: "c",
        default: "default"
      }

      const last = result.stdout.split("\n").pop()
      const ns = last ? JSON.parse(last) : {}
      assert.deepEqual(ns, abcNs)
    })
  })
})
