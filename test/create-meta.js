"use strict"

function createMeta(object) {
  return Object.assign(Object.create(null), object)
}

module.exports = createMeta
