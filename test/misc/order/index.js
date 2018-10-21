import assert from "assert"
import cycleTracker from "../../fixture/cycle/order/tracker.js"
import exportTracker from "../../fixture/export/order/tracker.js"
import importTracker from "../../fixture/import/order/tracker.js"
import "../../fixture/cycle/order"
import "../../fixture/export/order"
import "../../fixture/import/order"

export default () => {
  const trackers = [
    cycleTracker,
    exportTracker,
    importTracker
  ]

  for (const tracker of trackers) {
    assert.deepStrictEqual(tracker, ["a", "b", "c", "d"])
  }
}
