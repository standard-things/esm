"use strict"

const { toStringTag } = Symbol

const toStringTagDescriptor = {
  configurable: false,
  enumerable: false,
  value: "Module",
  writable: false
}

function createNamespace(object) {
  const ns = Object.assign({ __proto__: null }, object)
  return Object.seal(setToStringTag(ns))
}

function setToStringTag(object) {
  return Object.defineProperty(object, toStringTag, toStringTagDescriptor)
}

module.exports = createNamespace
