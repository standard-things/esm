// A simplified version of the AST traversal abstraction used by Recast.
// Copyright Ben Newman. Released under MIT license:
// https://github.com/benjamn/recast/blob/master/lib/fast-path.js

import isObject from "./util/is-object.js"

const alwaysTrue = () => true

class FastPath {
  constructor(ast) {
    this.stack = [ast]
  }

  // Temporarily push a `key` and its `value` onto `this.stack`, then call the
  // `visitor` method with a reference to `this` (modified) `FastPath` object.
  // Note that the stack is restored to its original state after the `visitor`
  // method has finished, so don't retain a reference to the path.
  call(visitor, methodName, key) {
    const stack = this.stack
    const object = stack[stack.length - 1]

    stack.push(key, object[key])
    const result = visitor[methodName](this)
    stack.length -= 2

    return result
  }

  // Similar to `FastPath.prototype.call`, except that the value obtained by
  // `this.getValue()` should be array-like. The `visitor` method is called with
  // a reference to this path object for each element of the array.
  each(visitor, methodName) {
    let i = -1
    const stack = this.stack
    const array = stack[stack.length - 1]
    const length = array.length

    while (++i < length) {
      stack.push(i, array[i])
      visitor[methodName](this)
      stack.length -= 2
    }
  }

  getParentNode(callback) {
    return getNode(this, -2, callback)
  }

  getValue() {
    const stack = this.stack
    return stack[stack.length - 1]
  }
}

function getNode(path, pos, callback) {
  const stack = path.stack
  const stackCount = stack.length
  let i = stackCount

  if (typeof callback !== "function") {
    callback = alwaysTrue
  }

  if (pos !== void 0) {
    i = pos < 0 ? i + pos : pos
  }

  while (i-- > 0) {
    // Without a complete list of node type names, we have to settle for this
    // fuzzy matching of object shapes.
    const value = stack[i--]
    if (isObject(value) &&
        ! Array.isArray(value) &&
        callback(value)) {
      return value
    }
  }

  return null
}

Object.setPrototypeOf(FastPath.prototype, null)

export default FastPath
