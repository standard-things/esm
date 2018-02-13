"use strict"

function createMeta(object) {
  return Object.assign({ __proto__: null }, object)
}

module.exports = createMeta
