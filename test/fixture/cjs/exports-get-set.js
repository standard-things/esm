"use strict"

let safe = "safe get"

module.exports = {
  get safe() {
    return safe
  },
  set safe(value) {
    safe = value
  },
  get unsafe() {
    throw new ReferenceError("unsafe")
  }
}
