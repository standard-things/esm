"use strict"

function isPlainObject(object) {
  return object != null &&
    Reflect.getPrototypeOf(object) === Object.prototype
}

module.exports = isPlainObject
