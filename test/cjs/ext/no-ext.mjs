import assert from "assert"

export default () => {
  return import("../../fixture/cjs/ext/no-ext-mjs")
    .then(() => assert.ok(true))
}
