"use strict"

let safe = "safe"

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
