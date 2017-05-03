"use strict";

var hasOwn = Object.prototype.hasOwnProperty;
var fastProto = null;
var __esSymbol = typeof Symbol === "function" ? Symbol.for("__esModule") : null;

// Creates an object with permanently fast properties in V8. See Toon Verwaest's
// post https://medium.com/@tverwaes/setting-up-prototypes-in-v8-ec9c9491dfe2#5f62
// for more details. Use %HasFastProperties(object) and the Node flag
// --allow-natives-syntax to check whether an object has fast properties.
function FastObject() {
  // A prototype object will have "fast properties" enabled once it is checked
  // against the inline property cache of a function, e.g. fastProto.property:
  // https://github.com/v8/v8/blob/6.0.122/test/mjsunit/fast-prototype.js#L48-L63
  if (fastProto !== null && typeof fastProto.property) {
    var result = fastProto;
    fastProto = FastObject.prototype = null;
    return result;
  }
  fastProto = FastObject.prototype = Object.create(null);
  return new FastObject;
}

// Initialize the inline property cache of FastObject.
FastObject();

exports.FastObject = FastObject;

function isObject(value) {
  return typeof value === "object" && value !== null;
}

// This version assumes exports is an object.
function getESModule(exports) {
  if (hasOwn.call(exports, "__esModule")) {
    return !! exports.__esModule;
  }

  if (__esSymbol && hasOwn.call(exports, __esSymbol)) {
    return !! exports[__esSymbol];
  }

  return false;
}

exports.getESModule = function (exports) {
  return isObject(exports) && getESModule(exports);
};

exports.setESModule = function (exports) {
  if (isObject(exports) && ! getESModule(exports)) {
    if (__esSymbol) {
      exports[__esSymbol] = true;
    } else {
      Object.defineProperty(exports, "__esModule", {
        value: true,
        enumerable: false,
        writable: false,
        configurable: true
      });
    }
  }
};

function getNamesFromPattern(pattern) {
  var queue = [pattern];
  var names = [];

  for (var i = 0; i < queue.length; ++i) {
    var pattern = queue[i];
    if (pattern === null) {
      // The ArrayPattern .elements array can contain null to indicate that
      // the position is a hole.
      continue;
    }

    switch (pattern.type) {
    case "Identifier":
      names.push(pattern.name);
      break;
    case "Property":
    case "ObjectProperty":
      queue.push(pattern.value);
      break;
    case "AssignmentPattern":
      queue.push(pattern.left);
      break;
    case "ObjectPattern":
      queue.push.apply(queue, pattern.properties);
      break;
    case "ArrayPattern":
      queue.push.apply(queue, pattern.elements);
      break;
    case "RestElement":
      queue.push(pattern.argument);
      break;
    }
  }

  return names;
}

exports.getNamesFromPattern = getNamesFromPattern;
