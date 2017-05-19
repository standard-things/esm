"use strict";

var codeOfA = "A".charCodeAt(0);
var codeOfZ = "Z".charCodeAt(0);
var hasOwn = Object.prototype.hasOwnProperty;

var useSymbol = typeof Symbol === "function";
var esStrKey = "__esModule";
var esSymKey = useSymbol ? Symbol.for(esStrKey) : null;

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

function isCapitalized(string) {
  if (typeof string !== "string") {
    return false;
  }
  var code = string.charCodeAt(0);
  return code >= codeOfA && code <= codeOfZ;
}

exports.isCapitalized = isCapitalized;

function isObject(value) {
  return typeof value === "object" && value !== null;
}

exports.isObject = isObject;

function isObjectLike(value) {
  var type = typeof value;
  return type === "function" || (type === "object" && value !== null);
}

exports.isObjectLike = isObjectLike;

function isNodeLike(value) {
  // Without a complete list of Node .type names, we have to settle for this
  // fuzzy matching of object shapes. However, the infeasibility of
  // maintaining a complete list of type names is one of the reasons we're
  // using the FastPath/Visitor abstraction in the first place.
  return isObject(value) &&
    ! Array.isArray(value) &&
    isCapitalized(value.type);
}

exports.isNodeLike = isNodeLike;

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
