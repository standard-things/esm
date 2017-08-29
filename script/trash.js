/* eslint strict: off, node/no-unsupported-features: ["error", { version: 4 }] */
"use strict"

const _trash = require("trash")

function trash(iterable) {
  return new Promise((resolve) =>
    _trash(iterable)
      .then(() => resolve())
      .catch(() => resolve())
  )
}

module.exports = trash
