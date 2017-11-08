import assert from "assert"
import tracker from "../fixture/order/tracker.js"
import "../fixture/order/d.mjs"

export default () => {
  assert.deepStrictEqual(tracker, ["a", "b", "c", "d"])
}
