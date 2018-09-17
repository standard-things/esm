"use strict"

const assert = require("assert")

module.exports = () => {
  return import("../fixture/ext/no-ext-cjs")
    .then(assert.fail)
    .catch(({ code }) => assert.strictEqual(code, "ERR_UNKNOWN_FILE_EXTENSION"))
}
