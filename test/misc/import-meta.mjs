import assert from "assert"
import createMeta from "../create-meta.js"
import path from "path"
import colon1 from "../fixture/with%3Acolon.mjs"
import colon2 from "../fixture/with%3Acolon.mjs?"
import colon3 from "../fixture/with%3Acolon.mjs?a#a"
import hash1 from "../fixture/with%23hash.mjs"
import hash2 from "../fixture/with%23hash.mjs?#"
import hash3 from "../fixture/with%23hash.mjs?b#b"
import percent1 from "../fixture/with%2520percent.mjs"
import percent2 from "../fixture/with%2520percent.mjs#c"
import percent3 from "../fixture/with%2520percent.mjs?c#c"

const isWin = process.platform === "win32"
const fileProtocol = "file://" + (isWin ? "/" : "")

const testPath = path.resolve(".")
const testURL = fileProtocol + testPath.replace(/\\/g, "/")

const colonURL = testURL + "/fixture/with:colon.mjs"
const hashURL = testURL + "/fixture/with%23hash.mjs"
const percentURL = testURL + "/fixture/with%2520percent.mjs"

export default () => {
  [
    colon1, colon2, colon3,
    hash1, hash2, hash3,
    percent1, percent2, percent3
  ]
  .forEach((def) => {
    assert.strictEqual(Reflect.getPrototypeOf(def), null)
  })

  let meta = createMeta({ url: colonURL })

  assert.deepStrictEqual(colon1, meta)

  meta = createMeta({ url: colonURL + "?" })
  assert.deepStrictEqual(colon2, meta)

  meta = createMeta({ url: colonURL + "?a#a" })
  assert.deepStrictEqual(colon3, meta)

  meta = createMeta({ url: hashURL })
  assert.deepStrictEqual(hash1, meta)

  meta = createMeta({ url: hashURL + "?#" })
  assert.deepStrictEqual(hash2, meta)

  meta = createMeta({ url: hashURL + "?b#b" })
  assert.deepStrictEqual(hash3, meta)

  meta = createMeta({ url: percentURL })
  assert.deepStrictEqual(percent1, meta)

  meta = createMeta({ url: percentURL + "#c" })
  assert.deepStrictEqual(percent2, meta)

  meta = createMeta({ url: percentURL + "?c#c" })
  assert.deepStrictEqual(percent3, meta)
}
