"use strict"

const toStringTag = Symbol.toStringTag

const useToStringTag = typeof toStringTag === "symbol"

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
  return useToStringTag
    ? Object.defineProperty(object, toStringTag, toStringTagDescriptor)
    : object
}

module.exports = createNamespace
