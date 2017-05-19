"use strict";

const runtime = require("./runtime.js");
const setDefaults = require("../lib/options").setDefaults;

let isDefaultsSet = false;
const parentModule = module.parent || __non_webpack_module__.parent;

module.exports = (options) => {
  if (! isDefaultsSet) {
    setDefaults(options);
    isDefaultsSet = true;
  }
};

require("./compile-hook.js");
require("./repl-hook.js");

runtime.enable(parentModule);
