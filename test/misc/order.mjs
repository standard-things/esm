import assert from "assert"
import { getLog } from "../fixture/order/tracker.mjs"
import "../fixture/order/c.mjs"

export default () => {
  assert.deepStrictEqual(getLog(), ["a", "b", "c"])
}
