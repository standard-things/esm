"use strict";

var useSymbol = typeof Symbol === "function";
var esStrKey = "__esModule";
var esSymKey = useSymbol ? Symbol.for(esStrKey) : null;
var hasOwn = Object.prototype.hasOwnProperty;

function getESModule(exports) {
  if (isObject(exports)) {
    if (useSymbol && hasOwn.call(exports, esSymKey)) {
      return !! exports[esSymKey];
    }

    if (hasOwn.call(exports, esStrKey)) {
      return !! exports[esStrKey];
    }
  }

  return false;
}

exports.getESModule = getESModule;

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

function setESModule(exports) {
  if (isObject(exports)) {
    if (useSymbol) {
      exports[esSymKey] = true;
    } else {
      Object.defineProperty(exports, esStrKey, {
        configurable: true,
        enumerable: false,
        value: true,
        writable: false
      });
    }
  }
}

exports.setESModule = setESModule;
