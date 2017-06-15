"use strict"

// A simplified version of the AST traversal abstraction used by Recast:
// https://github.com/benjamn/recast/blob/master/lib/fast-path.js

const utils = require("./utils.js")

class FastPath {
  constructor(ast) {
    this.stack = [ast]
  }

  // Temporarily push a key and its value onto this.stack, then call
  // the visitor method with a reference to this (modified) FastPath object.
  // Note that the stack will be restored to its original state after the
  // visitor method is finished, so don't retain a reference to the path.
  call(visitor, methodName, key) {
    const s = this.stack
    const object = s[s.length - 1]

    s.push(key, object[key])
    const result = visitor[methodName](this)
    s.length -= 2

    return result
  }

  // Similar to FastPath.prototype.call, except that the value obtained by
  // accessing this.getValue() should be array-like. The visitor method will be
  // called with a reference to this path object for each element of the array.
  each(visitor, methodName) {
    const s = this.stack
    const array = s[s.length - 1]

    let i = -1
    while (++i < array.length) {
      s.push(i, array[i])
      visitor[methodName](this)
      s.length -= 2
    }
  }

  getNode() {
    return getNodeAt(this, 0)
  }

  getParentNode() {
    return getNodeAt(this, 1)
  }

  getValue() {
    const s = this.stack
    const len = s.length
    return s[len - 1]
  }
}

function getNodeAt(path, pos) {
  const s = path.stack
  let i = s.length

  while (i-- > 0) {
    const value = s[i--]
    if (utils.isNodeLike(value) && --pos < 0) {
      return value
    }
  }
  return null
}

Object.setPrototypeOf(FastPath.prototype, null)

module.exports = FastPath
