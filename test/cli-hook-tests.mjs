import assert from "assert"
import execa from "execa"
import path from "path"
import require from "./require.js"

const isWin = process.platform === "win32"
const fileProtocol = "file://" + (isWin ? "/" : "")

const testPath = path.dirname(require.resolve("./tests.mjs"))
const testURL = fileProtocol + testPath.replace(/\\/g, "/")

const NODE_BIN = path.resolve(testPath, "env/prefix", isWin ? "node.exe" : "bin/node")

describe("command-line hook", function () {
  this.timeout(0)

  it("should not fail on unresolvable command-line arguments", () => {
    const args = [
      "./node_modules/cli",
      "UNRESOLVABLE_VALUE",
      "../index.js"
    ]

    return execa(NODE_BIN, args, {
      cwd: testPath,
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
      cwd: testPath,
      reject: false
    })
    .then((result) => {
      const url = testURL + "/fixture/main.mjs"

      const expected = {
        default: {
          mainModule: true,
          meta: { url }
        }
      }

      const jsonText = result
        .stdout
        .split("\n")
        .reverse()
        .find((line) => line.startsWith("{"))

      const exported = jsonText
        ? JSON.parse(jsonText)
        : {}

      assert.deepStrictEqual(exported, expected)
    })
  })
})
