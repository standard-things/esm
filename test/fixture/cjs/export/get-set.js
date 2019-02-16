"use strict"

let safe = "safe getter"

module.exports = {
  get safe() {
    return safe
  },
  set safe(value) {
    safe = value
  },
  get unsafe() {
    throw new ReferenceError("unsafe getter")
  }
}
