"use strict"

const regexp = /a/

const names = [
  "compile",
  "exec",
  "test"
]

names.forEach((name) => {
  Reflect.defineProperty(regexp, name, {
    configurable: true,
    enumerable: true,
    value: regexp[name],
    writable: true
  })
})

module.exports = regexp
