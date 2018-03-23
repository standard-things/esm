"use strict"

const _mockIo = require("mock-stdio")

function silentWrap(func) {
  return function (...args) {
    process.noDeprecation = true
    const result = Reflect.apply(func, this, args)
    Reflect.deleteProperty(process, "noDeprecation")
    return result
  }
}

const mockIo = {
  __proto__: null,
  end: _mockIo.end,
  start() {
    _mockIo.start()
    const { stderr, stdout } = process
    stderr.write = silentWrap(stderr.write)
    stdout.write = silentWrap(stdout.write)
  }
}

module.exports = mockIo
