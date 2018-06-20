import assert from "assert"
import { a, b, c } from "../../fixture/require-hook/named-exports"

export default () => {
  assert.deepStrictEqual([a, b, c], ["a", "b", "c"])
}
