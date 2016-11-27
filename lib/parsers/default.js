var REIFY_PARSER =
  typeof process === "object" &&
  typeof process.env === "object" &&
  process.env.REIFY_PARSER;

if (REIFY_PARSER === "acorn") {
  exports.parse = require("./acorn.js").parse;
} else if (REIFY_PARSER === "babylon") {
  exports.parse = require("./babylon.js").parse;
} else try {
  exports.parse = require(REIFY_PARSER);
} catch (e) {
  exports.parse = require("./acorn.js").parse;
}
