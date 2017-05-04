"use strict";

// A simplified version of the FastPath AST traversal abstraction used by
// Recast: https://github.com/benjamn/recast/blob/master/lib/fast-path.js

const assert = require("assert");
const utils = require("./utils.js");

const codeOfA = "A".charCodeAt(0);
const codeOfZ = "Z".charCodeAt(0);

class FastPath {
  constructor(ast) {
    this.stack = [ast];
  }

  // Static convenience function for coercing a value to a FastPath.
  static from(ast) {
    return new FastPath(ast);
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
      // If the callback needs to know the value of i, call
      // path.getName(), assuming path is the parameter name.
      callback(this);
      s.length -= 2;
    }

    s.length = origLen;
  }

  getContainer() {
    const s = this.stack;
    const len = s.length;
    if (len > 2) {
      return s[len - 3];
    }
    return null;
  }

  // The name of the current property is always the penultimate element of
  // this.stack, and always a String.
  getName() {
    const s = this.stack;
    const len = s.length;
    if (len > 1) {
      return s[len - 2];
    }
    // Since the name is always a string, null is a safe sentinel value to
    // return if we do not know the name of the (root) value.
    return null;
  }

  getNode() {
    return getNodeHelper(this, 0);
  }

  getParentNode() {
    return getNodeHelper(this, 1);
  }

  // The value of the current property is always the final element of
  // this.stack.
  getValue() {
    const s = this.stack;
    return s[s.length - 1];
  }

  replace(newValue) {
    const s = this.stack;
    const len = s.length;
    const oldValue = s[len - 1];
    const name = s[len - 2];
    const parent = s[len - 3];
    parent[name] = s[len - 1] = newValue;
    return oldValue;
  }

  valueIsNode() {
    return isNodeLike(this.getValue());
  }
};

Object.setPrototypeOf(FastPath.prototype, null);

function getNodeHelper(path, count) {
  const s = path.stack;

  for (let i = s.length - 1; i >= 0; i -= 2) {
    const value = s[i];
    if (isNodeLike(value) && --count < 0) {
      return value;
    }
  }
  return null;
}

function isCapitalized(string) {
  if (typeof string !== "string") {
    return false;
  }
  const code = string.charCodeAt(0);
  return code >= codeOfA && code <= codeOfZ;
}

// Without a complete list of Node .type names, we have to settle for this
// fuzzy matching of object shapes. However, the infeasibility of
// maintaining a complete list of type names is one of the reasons we're
// using the FastPath/Visitor abstraction in the first place.
function isNodeLike(value) {
  return utils.isObject(value) &&
    ! Array.isArray(value) &&
    isCapitalized(value.type);
}

module.exports = FastPath;
