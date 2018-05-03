"use strict"

const vm = require("vm")

const names = [
  "now",
  "parse",
  "UTC"
]

module.exports = names.reduce((Date, name) =>
  Object.defineProperty(Date, name, {
    __proto__: null,
    configurable: true,
    enumerable: true,
    value: Date[name],
    writable: true
  })
, vm.runInNewContext("Date"))
