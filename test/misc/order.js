import assert from "assert"
import { getLog } from "../fixture/order/tracker.js"
import "../fixture/order/c.js"

export function check() {
  assert.deepEqual(getLog(), ["a", "b", "c"])
}
