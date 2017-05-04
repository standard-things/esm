"use strict";
var __esSymbol = typeof Symbol === "function" ? Symbol.for("__esModule") : null;
var hasOwn = Object.prototype.hasOwnProperty;

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

function isObject(value) {
  return typeof value === "object" && value !== null;
}

exports.isObject = isObject;

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
