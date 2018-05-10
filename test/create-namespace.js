"use strict"

function createNamespace(object) {
  const ns = Object.assign({ __proto__: null }, object)

  Reflect.defineProperty(ns, Symbol.toStringTag, {
    value: "Module"
  })

  return Object.seal(ns)
}

module.exports = createNamespace
