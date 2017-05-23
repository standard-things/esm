"use strict";

const dynRequire = module.require ? module.require.bind(module) : __non_webpack_require__;

const REIFY_PARSER =
  typeof process === "object" && process !== null &&
  typeof process.env === "object" && process.env !== null &&
  process.env.REIFY_PARSER;

if (REIFY_PARSER === "acorn" ||
    REIFY_PARSER === "babylon" ||
    REIFY_PARSER === "top-level") {
  exports.parse = require("./" + process.env.REIFY_PARSER + ".js").parse;
} else try {
  exports.parse = dynRequire(REIFY_PARSER);
} catch (e) {
  exports.parse = dynRequire("./acorn.js").parse;
}
