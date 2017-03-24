"use strict";

const assert = require("assert");
const undefined = void 0;

// A simplified version of the FastPath AST traversal abstraction used by
// Recast: https://github.com/benjamn/recast/blob/master/lib/fast-path.js

function FastPath(value) {
  this.stack = [value];
}

const FPp = FastPath.prototype;
module.exports = FastPath;

// Static convenience function for coercing a value to a FastPath.
FastPath.from = function(obj) {
  return obj instanceof FastPath
    // Return a defensive copy of any existing FastPath instances.
    ? obj.copy()
    // Otherwise use obj as the value of the new FastPath instance.
    : new FastPath(obj);
};

FPp.copy = function copy() {
  const copy = Object.create(FastPath.prototype);
  copy.stack = this.stack.slice(0);
  return copy;
};

// The name of the current property is always the penultimate element of
// this.stack, and always a String.
FPp.getName = function getName() {
  const s = this.stack;
  const len = s.length;
  if (len > 1) {
    return s[len - 2];
  }
  // Since the name is always a string, null is a safe sentinel value to
  // return if we do not know the name of the (root) value.
  return null;
};

// The value of the current property is always the final element of
// this.stack.
FPp.getValue = function getValue() {
  const s = this.stack;
  return s[s.length - 1];
};

FPp.getContainer = function getContainer() {
  const s = this.stack;
  const len = s.length;
  if (len > 2) {
    return s[len - 3];
  }
  return null;
};

FPp.valueIsDuplicate = function () {
  const s = this.stack;
  const valueIndex = s.length - 1;
  return s.lastIndexOf(s[valueIndex], valueIndex - 1) >= 0;
};

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

// Without a complete list of Node .type names, we have to settle for this
// fuzzy matching of object shapes. However, the infeasibility of
// maintaining a complete list of type names is one of the reasons we're
// using the FastPath/Visitor abstraction in the first place.
function isNodeLike(value) {
  return value &&
    typeof value === "object" &&
    ! Array.isArray(value) &&
    isCapitalized(value.type);
}

const codeOfA = "A".charCodeAt(0);
const codeOfZ = "Z".charCodeAt(0);
function isCapitalized(string) {
  if (typeof string !== "string") return false;
  const code = string.charCodeAt(0);
  return code >= codeOfA && code <= codeOfZ;
}

FPp.valueIsNode = function () {
  return isNodeLike(this.getValue());
};

FPp.getNode = function getNode(count) {
  if (count === undefined) count = 0;
  return getNodeHelper(this, count);
};

FPp.getParentNode = function getParentNode(count) {
  if (count === undefined) count = 0;
  return getNodeHelper(this, count + 1);
};

// Temporarily push properties named by string arguments given after the
// callback function onto this.stack, then call the callback with a
// reference to this (modified) FastPath object. Note that the stack will
// be restored to its original state after the callback is finished, so it
// is probably a mistake to retain a reference to the path.
FPp.call = function call(callback/*, name1, name2, ... */) {
  const s = this.stack;
  const origLen = s.length;
  let value = s[origLen - 1];
  const argc = arguments.length;
  for (let i = 1; i < argc; ++i) {
    const name = arguments[i];
    value = value[name];
    s.push(name, value);
  }
  const result = callback(this);
  s.length = origLen;
  return result;
};

// Similar to FastPath.prototype.call, except that the value obtained by
// accessing this.getValue()[name1][name2]... should be array-like. The
// callback will be called with a reference to this path object for each
// element of the array.
FPp.each = function each(callback/*, name1, name2, ... */) {
  const s = this.stack;
  const origLen = s.length;
  const value = s[origLen - 1];
  const argc = arguments.length;

  for (let i = 1; i < argc; ++i) {
    const name = arguments[i];
    value = value[name];
    s.push(name, value);
  }

  for (let i = 0; i < value.length; ++i) {
    if (i in value) {
      s.push(i, value[i]);
      // If the callback needs to know the value of i, call
      // path.getName(), assuming path is the parameter name.
      callback(this);
      s.length -= 2;
    }
  }

  s.length = origLen;
};

// Similar to FastPath.prototype.call, except that the value obtained by
// accessing this.getValue()[name1][name2]... should be array-like. The
// callback will be called with a reference to this path object for each
// element of the array.
FPp.some = function some(callback/*, name1, name2, ... */) {
  const s = this.stack;
  const origLen = s.length;
  const value = s[origLen - 1];
  const argc = arguments.length;

  for (let i = 1; i < argc; ++i) {
    const name = arguments[i];
    value = value[name];
    s.push(name, value);
  }

  for (let i = 0; i < value.length; ++i) {
    if (i in value) {
      s.push(i, value[i]);
      // If the callback needs to know the value of i, call
      // path.getName(), assuming path is the parameter name.
      const result = callback(this);
      s.length -= 2;
      if (result) {
        return true;
      }
    }
  }

  s.length = origLen;

  return false;
};

FPp.replace = function (newValue) {
  const s = this.stack;
  const len = s.length;
  const oldValue = s[len - 1];
  const name = s[len - 2];
  const parent = s[len - 3];
  parent[name] = s[len - 1] = newValue;
  return oldValue;
};
