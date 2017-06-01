"use strict"

const hashSym = Symbol.for("hash")
const keysSym = Symbol.for("keys")

class OrderedMap {
  constructor() {
    this[hashSym] = Object.create(null)
    this[keysSym] = []
  }

  get(key) {
    return this[hashSym][key]
  }

  has(key) {
    return key in this[hashSym]
  }

  keys() {
    return this[keysSym]
  }

  set(key, value) {
    const hash = this[hashSym]
    if (! (key in hash)) {
      this[keysSym].push(key)
    }
    hash[key] = value
    return this
  }
}

module.exports = OrderedMap
