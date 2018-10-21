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

const carriageReturnURL = testURL + "/fixture/with%0Dcarriage-return.mjs"
const colonURL = testURL + "/fixture/with:colon.mjs"
const hashURL = testURL + "/fixture/with%23hash.mjs"
const newlineURL = testURL + "/fixture/with%0Anewline.mjs"
const percentURL = testURL + "/fixture/with%2520percent.mjs"
const questionMarkURL = testURL + "/fixture/with%3Fquestion-mark.mjs"
const tabURL = testURL + "/fixture/with%09tab.mjs"

export default () => {
  return Promise
    .all([
      "../fixture/with%0Dcarriage-return.mjs",
      "../fixture/with%0Dcarriage-return.mjs?",
      "../fixture/with%0Dcarriage-return.mjs?a#a",
      "../fixture/with%0Anewline.mjs",
      "../fixture/with%0Anewline.mjs?#",
      "../fixture/with%0Anewline.mjs?b#b",
      "../fixture/with%3Fquestion-mark.mjs",
      "../fixture/with%3Fquestion-mark.mjs#c",
      "../fixture/with%3Fquestion-mark.mjs?c#c",
      "../fixture/with%09tab.mjs",
      "../fixture/with%09tab.mjs#c",
      "../fixture/with%09tab.mjs?c#c"
    ]
    .map((request) => {
      if (! isWin) {
        return import(request)
          .then((ns) => ns.default)
      }
    }))
    .then((conditionals) => {
      const [
        carriageReturn1, carriageReturn2, carriageReturn3,
        newline1, newline2, newline3,
        questionMark1, questionMark2, questionMark3,
        tab1, tab2, tab3
      ] = conditionals

      const imports = [
        carriageReturn1, carriageReturn2, carriageReturn3,
        colon1, colon2, colon3,
        hash1, hash2, hash3,
        newline1, newline2, newline3,
        percent1, percent2, percent3,
        questionMark1, questionMark2, questionMark3,
        tab1, tab2, tab3
      ]

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

      if (! isWin) {
        meta = createMeta({ url: carriageReturnURL })
        assert.deepStrictEqual(carriageReturn1, meta)

        meta = createMeta({ url: carriageReturnURL + "?" })
        assert.deepStrictEqual(carriageReturn2, meta)

        meta = createMeta({ url: carriageReturnURL + "?a#a" })
        assert.deepStrictEqual(carriageReturn3, meta)

        meta = createMeta({ url: newlineURL })
        assert.deepStrictEqual(newline1, meta)

        meta = createMeta({ url: newlineURL + "?#" })
        assert.deepStrictEqual(newline2, meta)

        meta = createMeta({ url: newlineURL + "?b#b" })
        assert.deepStrictEqual(newline3, meta)

        meta = createMeta({ url: questionMarkURL })
        assert.deepStrictEqual(questionMark1, meta)

        meta = createMeta({ url: questionMarkURL + "#c" })
        assert.deepStrictEqual(questionMark2, meta)

        meta = createMeta({ url: questionMarkURL + "?c#c" })
        assert.deepStrictEqual(questionMark3, meta)

        meta = createMeta({ url: tabURL })
        assert.deepStrictEqual(tab1, meta)

        meta = createMeta({ url: tabURL + "#c" })
        assert.deepStrictEqual(tab2, meta)

        meta = createMeta({ url: tabURL + "?c#c" })
        assert.deepStrictEqual(tab3, meta)
      }

      for (const def of imports) {
        if (def) {
          assert.strictEqual(Reflect.getPrototypeOf(def), null)
        }
      }
    })
}
