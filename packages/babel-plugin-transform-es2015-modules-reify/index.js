module.exports = function () {
  var transform = require("reify/lib/compiler.js").transform;
  var options = {
    parse: require("reify/lib/parsers/babylon.js").parse
  };

  return {
    visitor: {
      Program: function (path) {
        path.replaceWith(transform(path.node, options));
      }
    }
  };
};
