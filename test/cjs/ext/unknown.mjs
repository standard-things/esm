import assert from "assert"

export default () => {
  return import("../../fixture/cjs/ext/a.mjs.unknown")
    .then(assert.fail)
    .catch(({ code }) => assert.strictEqual(code, "ERR_UNKNOWN_FILE_EXTENSION"))
}
