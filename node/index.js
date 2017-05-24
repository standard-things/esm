"use strict";

const setDefaults = require("../lib/options.js").setDefaults;
const Runtime = require("./runtime.js");

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

Runtime.enable(parentModule);
