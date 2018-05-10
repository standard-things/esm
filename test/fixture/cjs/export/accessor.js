"use strict"

let b

const target = {
  set a(value) {
    Reflect.defineProperty(this, "a", {
      configurable: true,
      enumerable: true,
      value,
      writable: true
    })

    delete target.a
    b = value
  },
  get b() {
    return b
  }
}

module.exports = target
