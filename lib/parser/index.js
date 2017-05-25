"use strict";

const dynRequire = module.require ? module.require.bind(module) : __non_webpack_require__;

if (process.env.ESM_PARSER === "acorn" ||
    process.env.ESM_PARSER === "top-level") {
  exports.parse = require("./" + process.env.ESM_PARSER + ".js").parse;
} else try {
  exports.parse = dynRequire(process.env.ESM_PARSER);
} catch (e) {
  exports.parse = dynRequire("./acorn.js").parse;
}
