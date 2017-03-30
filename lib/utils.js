"use strict";

exports.getNamesFromPattern = function (pattern) {
  var queue = [pattern];
  var names = [];

  for (var i = 0; i < queue.length; ++i) {
    var pattern = queue[i];
    if (! pattern) {
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
};
