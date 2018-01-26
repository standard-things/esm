import assert from "assert"

export default () => {
  return import("../../fixture/cjs/ext/a.mjs.unknown")
    .then(() => assert.ok(true))
}
