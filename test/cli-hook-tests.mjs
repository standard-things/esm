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
    .then((result) => {
      if (result.stderr) {
        throw new Error(result.stderr)
      }

      assert.ok(true)
    })
  })
})
