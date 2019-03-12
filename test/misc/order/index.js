import assert from "assert"
import cycleTracker from "../../fixture/cycle/order/tracker.js"
import exportTracker from "../../fixture/export/order/tracker.js"
import importTracker from "../../fixture/import/order/tracker.js"
import "../../fixture/cycle/order/index.mjs"
import "../../fixture/export/order/index.js"
import "../../fixture/import/order/index.mjs"

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
