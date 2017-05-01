"use strict";

const runtime = require("../lib/runtime.js");

runtime.enable(module.parent);
module.exports = exports = require("./compile-hook.js");
