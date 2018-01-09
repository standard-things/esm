import assert from "assert"
import tracker from "../fixture/import/order/tracker.js"
import "../fixture/import/order"

export default () => {
  assert.deepStrictEqual(tracker, ["a", "b", "c", "d"])
}
