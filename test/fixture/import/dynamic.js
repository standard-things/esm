"use strict"

module.exports = Promise
  .all([
    import("../export/abc.mjs"),
    import("../export/def.js")
  ])
