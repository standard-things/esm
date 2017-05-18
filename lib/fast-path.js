"use strict";

// A simplified version of the AST traversal abstraction used by Recast:
// https://github.com/benjamn/recast/blob/master/lib/fast-path.js

const assert = require("assert");
const utils = require("./utils.js");

class FastPath {
  constructor(ast) {
    this.stack = [ast];
  }

  // Temporarily push properties named by string arguments given after the
  // callback function onto this.stack, then call the callback with a
  // reference to this (modified) FastPath object. Note that the stack will
  // be restored to its original state after the callback is finished, so it
  // is probably a mistake to retain a reference to the path.
  call(callback/*, name1, name2, ... */) {
    const s = this.stack;
    const origLen = s.length;
    const argCount = arguments.length;
    let value = s[origLen - 1];

    for (let i = 1; i < argCount; ++i) {
      const name = arguments[i];
      value = value[name];
      s.push(name, value);
    }
    const result = callback(this);
    s.length = origLen;

    return result;
  }

  // Similar to FastPath.prototype.call, except that the value obtained by
  // accessing this.getValue()[name1][name2]... should be array-like. The
  // callback will be called with a reference to this path object for each
  // element of the array.
  each(callback/*, name1, name2, ... */) {
    const s = this.stack;
    const origLen = s.length;
    const argCount = arguments.length;
    let value = s[origLen - 1];

    for (let i = 1; i < argCount; ++i) {
      const name = arguments[i];
      value = value[name];
      s.push(name, value);
    }

    for (let i = 0; i < value.length; ++i) {
      s.push(i, value[i]);
      // If the callback needs to know the value of i, call path.getName(),
      // assuming path is the parameter name.
      callback(this);
      s.length -= 2;
    }

    s.length = origLen;
  }

  getContainer() {
    return getStackAt(this, 3);
  }

  getName() {
    // The name of the current property is always the penultimate element of
    // this.stack, and always a String. Since the name is always a string,
    // null is a safe sentinel value to return if we do not know the name of
    // the (root) value.
    return getStackAt(this, 2);
  }

  getNode() {
    return getNodeAt(this, 0);
  }

  getParentNode() {
    return getNodeAt(this, 1);
  }

  getValue() {
    // The value of the current property is always the last element of
    // this.stack.
    return getStackAt(this, 1);
  }

  replace(newValue) {
    const s = this.stack;
    const len = s.length;
    const oldValue = this.getValue();

    if (len > 2) {
      const parent = s[len - 3];
      const name = this.getName();
      parent[name] = s[len - 1] = newValue;
    }
    return oldValue;
  }

  valueIsNode() {
    return utils.isNodeLike(this.getValue());
  }
};

Object.setPrototypeOf(FastPath.prototype, null);

function getNodeAt(path, pos) {
  const s = path.stack;

  for (let i = s.length - 1; i >= 0; i -= 2) {
    const value = s[i];
    if (utils.isNodeLike(value) && --pos < 0) {
      return value;
    }
  }
  return null;
}

function getStackAt(path, pos) {
  const s = path.stack;
  const len = s.length;
  return len < pos ? null : s[len - pos];
}

module.exports = FastPath;
