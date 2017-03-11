module.exports = function () {
  var transform = require("reify/lib/compiler.js").transform;
  var parse = require("reify/lib/parsers/babylon.js").parse;

  return {
    visitor: {
      Program: function (path) {
        transform(path.node, Object.assign({
          parse: parse
        }, this.opts));
      }
    }
  };
};
