"use strict";

var fastProto = null;

// A prototype object will have "fast properties" enabled once it is checked
// against the inline property cache of a function.
function checkInlineCache(object) { object.property; }

// Initialize the inline property cache of checkInlineCache by invoking it once
// with any object.
checkInlineCache(checkInlineCache);

// Creates an object with "fast properties" in V8. Use %HasFastProperties(object)
// and the Node flag --allow-natives-syntax to check whether an object has fast
// properties. FastObject is based on the V8 unit test:
// https://github.com/v8/v8/blob/6.0.122/test/mjsunit/fast-prototype.js#L48-L63
function FastObject() {
  if (fastProto !== null) {
    var object = fastProto;
    fastProto = FastObject.prototype = null;
    checkInlineCache(object);
    return object;
  }
  fastProto = FastObject.prototype = Object.create(null);
  return new FastObject;
}

exports.FastObject = FastObject;

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
