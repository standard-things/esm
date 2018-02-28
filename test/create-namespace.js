"use strict"

function createNamespace(object) {
  const ns = Object.assign({ __proto__: null }, object)

  Reflect.defineProperty(ns, Symbol.toStringTag, {
    __proto__: null,
    configurable: false,
    enumerable: false,
    value: "Module",
    writable: false
  })

  return Object.seal(ns)
}

module.exports = createNamespace
