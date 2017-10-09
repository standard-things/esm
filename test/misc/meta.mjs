import assert from "assert"
import createMeta from "../create-meta.js"
import path from "path"
import require from "../require.js"
import mc1 from "../fixture/with%3Acolon.mjs"
import mc2 from "../fixture/with%3Acolon.mjs?a#a"
import mp1 from "../fixture/with%23pound.mjs"
import mp2 from "../fixture/with%23pound.mjs?b#b"

const isWin = process.platform === "win32"

const testPath = path.dirname(require.resolve("./tests.mjs"))
const testURL = "file://" + (isWin ? "/" : "") + testPath.replace(/\\/g, "/")

const mcPath = path.resolve(testPath, "fixture/with%3Acolon.mjs")
const mcURL = testURL + "/fixture/with:colon.mjs"

const mpPath = path.resolve(testPath, "fixture/with%23pound.mjs")
const mpURL = testURL + "/fixture/with%23pound.mjs"

export default () => {
  const defs = [mc1, mc2, mp1, mp2]
  defs.forEach((def) => assert.strictEqual(Object.getPrototypeOf(def), null))

  let meta = createMeta({ url: mcURL })
  assert.deepStrictEqual(mc1, meta)

  meta = createMeta({ url: mcURL + "?a#a" })
  assert.deepStrictEqual(mc2, meta)

  meta = createMeta({ url: mpURL })
  assert.deepStrictEqual(mp1, meta)

  meta = createMeta({ url: mpURL + "?b#b" })
  assert.deepStrictEqual(mp2, meta)
}
