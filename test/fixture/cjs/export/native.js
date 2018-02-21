"use strict"

const set = new Set(["a", "b"])

const names = [
  "add",
  "clear",
  "delete",
  "entries",
  "forEach",
  "has",
  "keys",
  "size",
  "values"
]

names.forEach((name) => {
  Object.defineProperty(set, name, {
    configurable: true,
    enumerable: true,
    value: set[name],
    writable: true
  })
})

module.exports = set
