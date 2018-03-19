"use strict"

module.exports = (0, eval)(`
  Promise
    .all([
      import("../../export/abc.mjs"),
      import("../../export/def.js")
    ])
`)
