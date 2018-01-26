"use strict"

const assert = require("assert")

module.exports = () => {
  return import("../fixture/ext/no-ext-js")
    .then(() => assert.ok(false))
    .catch((e) => assert.strictEqual(e.code, "ERR_UNKNOWN_FILE_EXTENSION"))
}
