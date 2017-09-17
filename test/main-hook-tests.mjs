import assert from "assert"
import execa from "execa"
import path from "path"

const isWin = process.platform === "win32"

const __filename = import.meta.url.slice(isWin ? 8 : 7)
const __dirname = path.dirname(__filename)

const NODE_BIN = path.resolve(__dirname, "./env/prefix", isWin ? "node.exe" : "bin/node")

describe("module.runMain hook", () => {
  it("should work with Node -r and --require options", () => {
    const options = ["-r", "--require"]

    return Promise.all(options.map((option) => {
      const args = [
        option, "../index.js",
        "./fixture/main.mjs"
      ]

      return execa(NODE_BIN, args, {
        cwd: __dirname,
        reject: false
      })
    }))
    .then((results) => {
      results.forEach((result) => {
        if (result.stderr) {
          throw new Error(result.stderr)
        }

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
})
