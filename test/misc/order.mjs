import assert from "assert"
import exportTracker from "../fixture/export/order/tracker.js"
import importTracker from "../fixture/import/order/tracker.js"
import "../fixture/export/order"
import "../fixture/import/order"

export default () => {
  const expected = ["a", "b", "c", "d"]
  assert.deepStrictEqual(exportTracker, expected)
  assert.deepStrictEqual(importTracker, expected)
}
