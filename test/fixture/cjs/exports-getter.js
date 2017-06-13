"use strict"

module.exports = {
  get safe() {
    return "safe"
  },
  get unsafe() {
    throw new ReferenceError("unsafe")
  }
}
