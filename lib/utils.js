"use strict";

// Using Node 4+ features is safe in this module, because it is not
// depended upon by reify/lib/runtime.

const codeOfA = "A".charCodeAt(0);
const codeOfZ = "Z".charCodeAt(0);
const runtimeUtils = require("./runtime/utils.js");
const isObject = exports.isObject = runtimeUtils.isObject;

function getNamesFromPattern(pattern) {
  const names = [];
  const queue = [pattern];

  for (var i = 0; i < queue.length; ++i) {
    const pattern = queue[i];
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
  const code = string.charCodeAt(0);
  return code >= codeOfA && code <= codeOfZ;
}

exports.isCapitalized = isCapitalized;

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

function toString(value) {
  if (typeof value === "string") {
    return value;
  }
  return value == null ? "" : String(value);
}

exports.toString = toString;
