var hasOwn = Object.prototype.hasOwnProperty;
var objToStr = Object.prototype.toString;
var objStr = objToStr.call({});

function isPlainObject(value) {
  return objToStr.call(value) === objStr;
}
exports.isPlainObject = isPlainObject;

exports.shallowObjEqual = function(a, b) {
  if (a === b) {
    return true;
  }

  if (! isPlainObject(a) ||
      ! isPlainObject(b)) {
    return false;
  }

  var aKeys = Object.keys(a);
  var bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  return aKeys.every(function (key) {
    return hasOwn.call(b, key) &&
      a[key] === b[key];
  });
};

var defaultCompileOptions = {
  generateLetDeclarations: false,
  parse: require("./parsers/default.js").parse,
  ast: false
};

exports.getOption = function (options, name) {
  if (options && hasOwn.call(options, name)) {
    return options[name];
  }
  return defaultCompileOptions[name];
};

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
