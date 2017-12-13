"use strict"

function isPlainObject(object) {
  return object != null &&
    Object.getPrototypeOf(object) === Object.prototype
}

module.exports = isPlainObject
