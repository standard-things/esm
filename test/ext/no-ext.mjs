import assert from "assert"

export default () => {
  return import("../fixture/ext/no-ext-mjs")
    .then(() => assert.ok(false))
    .catch((e) => assert.strictEqual(e.code, "ERR_UNKNOWN_FILE_EXTENSION"))
}
