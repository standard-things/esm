"use strict"

const assert = require("assert")

module.exports = () => {
  return import("../fixture/ext/a.js.unknown")
    .then(assert.fail)
    .catch(({ code }) => assert.strictEqual(code, "ERR_UNKNOWN_FILE_EXTENSION"))
}
