import assert from "assert"
import a, { b, C } from "../fixture/export/async-generators.mjs"

export default () => {
  [
    a(),
    b.b(),
    new C().c()
  ]
  .forEach((gen) => {
    assert.strictEqual(gen[Symbol.toStringTag], "AsyncGenerator")
  })
}
