"use strict";

const env = require("../env.js");
const dynRequire = module.require ? module.require.bind(module) : __non_webpack_require__;

if (env.REIFY_PARSER === "acorn" ||
    env.REIFY_PARSER === "babylon" ||
    env.REIFY_PARSER === "top-level") {
  exports.parse = require("./" + env.REIFY_PARSER + ".js").parse;
} else try {
  exports.parse = dynRequire(env.REIFY_PARSER);
} catch (e) {
  exports.parse = dynRequire("./acorn.js").parse;
}
