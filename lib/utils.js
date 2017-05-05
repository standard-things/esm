"use strict";

var useSymbol = typeof Symbol === "function";
var esStrKey = "__esModule";
var esSymKey = useSymbol ? Symbol.for(esStrKey) : null;
var hasOwn = Object.prototype.hasOwnProperty;

function getESModule(exported) {
  if (isObjectLike(exported)) {
    if (useSymbol && hasOwn.call(exported, esSymKey)) {
      return !! exported[esSymKey];
    }

    if (hasOwn.call(exported, esStrKey)) {
      return !! exported[esStrKey];
    }
  }

  return false;
}

exports.getESModule = getESModule;

function getNamesFromPattern(pattern) {
  var names = [];
  var queue = [pattern];

  for (var i = 0; i < queue.length; ++i) {
    var pattern = queue[i];
    if (pattern === null) {
      // The ArrayPattern .elements array can contain null to indicate that
      // the position is a hole.
      continue;
    }

    // Cases are ordered from most to least likely to encounter.
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

function isObjectLike(value) {
  return typeof value === "function" || isObject(value);
}

exports.isObjectLike = isObjectLike;

function setESModule(exported) {
  if (isObjectLike(exported)) {
    if (useSymbol) {
      exported[esSymKey] = true;
    } else {
      Object.defineProperty(exported, esStrKey, {
        configurable: true,
        enumerable: false,
        value: true,
        writable: false
      });
    }
  }
}

exports.setESModule = setESModule;

function toString(value) {
  if (typeof value === "string") {
    return value;
  }
  return value == null ? "" : String(value);
}

exports.toString = toString;
