"use strict"

function isPlainObject(object) {
  return Object.getPrototypeOf(object) === Object.prototype
}

module.exports = isPlainObject
