import assert from "assert"
import { getLog } from "./order-tracker"
import "./order-c"

export function check() {
  assert.deepEqual(getLog(), ["a", "b", "c"])
}
