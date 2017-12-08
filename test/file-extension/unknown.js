"use strict"

const assert = require("assert")

module.exports = () => {
  return import("../fixture/file-extension/a.js.unknown")
    .then(() => assert.ok(false))
    .catch((e) => assert.strictEqual(e.code, "ERR_UNKNOWN_FILE_EXTENSION"))
}
