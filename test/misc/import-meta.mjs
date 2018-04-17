import assert from "assert"
import createMeta from "../create-meta.js"
import path from "path"
import colon1 from "../fixture/with%3Acolon.mjs"
import colon2 from "../fixture/with%3Acolon.mjs?"
import colon3 from "../fixture/with%3Acolon.mjs?a#a"
import pound1 from "../fixture/with%23pound.mjs"
import pound2 from "../fixture/with%23pound.mjs?#"
import pound3 from "../fixture/with%23pound.mjs?b#b"
import percent1 from "../fixture/with%2520percent.mjs"
import percent2 from "../fixture/with%2520percent.mjs#c"
import percent3 from "../fixture/with%2520percent.mjs?c#c"

const isWin = process.platform === "win32"
const fileProtocol = "file://" + (isWin ? "/" : "")

const testPath = path.resolve(".")
const testURL = fileProtocol + testPath.replace(/\\/g, "/")

const colonPath = path.resolve(testPath, "fixture/with%3Acolon.mjs")
const colonURL = testURL + "/fixture/with:colon.mjs"

const poundPath = path.resolve(testPath, "fixture/with%23pound.mjs")
const poundURL = testURL + "/fixture/with%23pound.mjs"

const percentPath = path.resolve(testPath, "fixture/with%2520percent.mjs")
const percentURL = testURL + "/fixture/with%2520percent.mjs"

export default () => {
  [
    colon1, colon2, colon3,
    pound1, pound2, pound3,
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

  meta = createMeta({ url: poundURL })
  assert.deepStrictEqual(pound1, meta)

  meta = createMeta({ url: poundURL + "?#" })
  assert.deepStrictEqual(pound2, meta)

  meta = createMeta({ url: poundURL + "?b#b" })
  assert.deepStrictEqual(pound3, meta)

  meta = createMeta({ url: percentURL })
  assert.deepStrictEqual(percent1, meta)

  meta = createMeta({ url: percentURL + "#c" })
  assert.deepStrictEqual(percent2, meta)

  meta = createMeta({ url: percentURL + "?c#c" })
  assert.deepStrictEqual(percent3, meta)
}
