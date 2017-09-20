import assert from "assert"
import path from "path"
import mc1 from "../fixture/with%3Acolon.mjs"
import mc2 from "../fixture/with%3Acolon.mjs?a#a"
import mp1 from "../fixture/with%23pound.mjs"
import mp2 from "../fixture/with%23pound.mjs?b#b"

const isWin = process.platform === "win32"

const __filename = import.meta.url.slice(isWin ? 8 : 7)
const __dirname = path.dirname(__filename)

const testPath = path.resolve(__dirname, "..")
const testURL = "file://" + (isWin ? "/" : "") + testPath.replace(/\\/g, "/")

const mcPath = path.resolve(testPath, "fixture/with%3Acolon.mjs")
const mcURL = testURL + "/fixture/with:colon.mjs"

const mpPath = path.resolve(testPath, "fixture/with%23pound.mjs")
const mpURL = testURL + "/fixture/with%23pound.mjs"

export default () => {
  const defs = [mc1, mc2, mp1, mp2]
  defs.forEach((def) => assert.strictEqual(Object.getPrototypeOf(def), null))

  assert.deepEqual(mc1, { url: mcURL })
  assert.deepEqual(mc2, { url: mcURL + "?a#a" })

  assert.deepEqual(mp1, { url: mpURL })
  assert.deepEqual(mp2, { url: mpURL + "?b#b" })
}
