"use strict"

module.exports = eval(`
  Promise
    .all([
      import("../../export/abc.mjs"),
      import("../../export/def.js")
    ])
`)
