// This file defines utility functions that are available as methods of
// `this` inside setter functions.

exports.assign = Object.assign || function (obj) {
  var argc = arguments.length;
  for (var i = 1; i < argc; ++i) {
    var arg = arguments[i];
    if (arg && typeof arg === "object") {
      var keys = Object.keys(arg);
      for (var k = 0; k < keys.length; ++k) {
        var key = keys[k];
        obj[key] = arg[key];
      }
    }
  }
  return obj;
};
