"use strict";

require("./compile-hook.js");
require("./repl-hook.js");

const setDefaults = require("../lib/options").setDefaults;
const runtime = require("../lib/runtime.js");

let isDefaultsSet = false;

module.exports = (options) => {
  if (! isDefaultsSet) {
    setDefaults(options);
    isDefaultsSet = true;
  }
};

runtime.enable(module.parent || __non_webpack_module__.parent);
