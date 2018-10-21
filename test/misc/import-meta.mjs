import assert from "assert"
import createMeta from "../create-meta.js"
import path from "path"
import safeCharacters1 from "../fixture/safe-characters%5B%23%25&;=%5D.mjs"
import safeCharacters2 from "../fixture/safe-characters%5B%23%25&;=%5D.mjs?"
import safeCharacters3 from "../fixture/safe-characters%5B%23%25&;=%5D.mjs?#"
import safeCharacters4 from "../fixture/safe-characters%5B%23%25&;=%5D.mjs?a#a"

const isWin = process.platform === "win32"

const fileProtocol = "file://" + (isWin ? "/" : "")

const testPath = path.resolve(".")
const testURL = fileProtocol + testPath.replace(/\\/g, "/")

const safeCharactersURL = testURL + "/fixture/safe-characters%5B%23%25&;=%5D.mjs"
const unsafeCharactersURL = testURL + "/fixture/unsafe-characters%5B%08%09%0A%0D:%3F%5D.mjs"

export default () => {
  return Promise
    .all([
      unsafeCharactersURL,
      unsafeCharactersURL + "?",
      unsafeCharactersURL + "?#",
      unsafeCharactersURL + "?a#a"
    ]
    .map((request) => {
      if (! isWin) {
        return import(request)
          .then((ns) => ns.default)
      }
    }))
    .then((unsafeMetas) => {
      const datas = [
        { actual: safeCharacters1, expected: safeCharactersURL },
        { actual: safeCharacters2, expected: safeCharactersURL + "?" },
        { actual: safeCharacters3, expected: safeCharactersURL + "?#" },
        { actual: safeCharacters4, expected: safeCharactersURL + "?a#a" }
      ]

      if (! isWin) {
        datas.push(
          { actual: unsafeMetas[0], expected: unsafeCharactersURL },
          { actual: unsafeMetas[1], expected: unsafeCharactersURL + "?" },
          { actual: unsafeMetas[2], expected: unsafeCharactersURL + "?#" },
          { actual: unsafeMetas[3], expected: unsafeCharactersURL + "?a#a" }
        )
      }

      for (const { actual, expected } of datas) {
        assert.deepStrictEqual(actual, createMeta({ url: expected }))
        assert.strictEqual(Reflect.getPrototypeOf(actual), null)
      }
    })
}
