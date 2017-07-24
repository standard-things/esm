// A simplified version of the AST traversal abstraction used by Recast.
// Copyright Ben Newman. Released under MIT license:
// https://github.com/benjamn/recast/blob/master/lib/fast-path.js

import isObject from "./util/is-object.js"

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
    let i = -1
    const s = this.stack
    const array = s[s.length - 1]

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

  while (i--) {
    // Without a complete list of Node .type names, we have to settle for this
    // fuzzy matching of object shapes.
    const value = s[i--]
    if (isObject(value) &&
        ! Array.isArray(value) &&
        --pos < 0) {
      return value
    }
  }

  return null
}

Object.setPrototypeOf(FastPath.prototype, null)

export default FastPath
