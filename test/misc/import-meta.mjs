import assert from "assert"
import createMeta from "../create-meta.js"
import path from "path"
import carriageReturn1 from "../fixture/with%0Dcarriage-return.mjs"
import carriageReturn2 from "../fixture/with%0Dcarriage-return.mjs?"
import carriageReturn3 from "../fixture/with%0Dcarriage-return.mjs?a#a"
import colon1 from "../fixture/with%3Acolon.mjs"
import colon2 from "../fixture/with%3Acolon.mjs?"
import colon3 from "../fixture/with%3Acolon.mjs?a#a"
import hash1 from "../fixture/with%23hash.mjs"
import hash2 from "../fixture/with%23hash.mjs?#"
import hash3 from "../fixture/with%23hash.mjs?b#b"
import newline1 from "../fixture/with%0Anewline.mjs"
import newline2 from "../fixture/with%0Anewline.mjs?#"
import newline3 from "../fixture/with%0Anewline.mjs?b#b"
import percent1 from "../fixture/with%2520percent.mjs"
import percent2 from "../fixture/with%2520percent.mjs#c"
import percent3 from "../fixture/with%2520percent.mjs?c#c"
import tab1 from "../fixture/with%09tab.mjs"
import tab2 from "../fixture/with%09tab.mjs#c"
import tab3 from "../fixture/with%09tab.mjs?c#c"

const isWin = process.platform === "win32"

const fileProtocol = "file://" + (isWin ? "/" : "")

const testPath = path.resolve(".")
const testURL = fileProtocol + testPath.replace(/\\/g, "/")

const carriageReturnURL = testURL + "/fixture/with%0Dcarriage-return.mjs"
const colonURL = testURL + "/fixture/with:colon.mjs"
const hashURL = testURL + "/fixture/with%23hash.mjs"
const newlineURL = testURL + "/fixture/with%0Anewline.mjs"
const percentURL = testURL + "/fixture/with%2520percent.mjs"
const tabURL = testURL + "/fixture/with%09tab.mjs"

export default () => {
  [
    carriageReturn1, carriageReturn2, carriageReturn3,
    colon1, colon2, colon3,
    hash1, hash2, hash3,
    newline1, newline2, newline3,
    percent1, percent2, percent3,
    tab1, tab2, tab3
  ]
  .forEach((def) => {
    assert.strictEqual(Reflect.getPrototypeOf(def), null)
  })

  let meta = createMeta({ url: carriageReturnURL })

  assert.deepStrictEqual(carriageReturn1, meta)

  meta = createMeta({ url: carriageReturnURL + "?" })
  assert.deepStrictEqual(carriageReturn2, meta)

  meta = createMeta({ url: carriageReturnURL + "?a#a" })
  assert.deepStrictEqual(carriageReturn3, meta)

  meta = createMeta({ url: colonURL })
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

  meta = createMeta({ url: newlineURL })
  assert.deepStrictEqual(newline1, meta)

  meta = createMeta({ url: newlineURL + "?#" })
  assert.deepStrictEqual(newline2, meta)

  meta = createMeta({ url: newlineURL + "?b#b" })
  assert.deepStrictEqual(newline3, meta)

  meta = createMeta({ url: percentURL })
  assert.deepStrictEqual(percent1, meta)

  meta = createMeta({ url: percentURL + "#c" })
  assert.deepStrictEqual(percent2, meta)

  meta = createMeta({ url: percentURL + "?c#c" })
  assert.deepStrictEqual(percent3, meta)

  meta = createMeta({ url: tabURL })
  assert.deepStrictEqual(tab1, meta)

  meta = createMeta({ url: tabURL + "#c" })
  assert.deepStrictEqual(tab2, meta)

  meta = createMeta({ url: tabURL + "?c#c" })
  assert.deepStrictEqual(tab3, meta)
}
