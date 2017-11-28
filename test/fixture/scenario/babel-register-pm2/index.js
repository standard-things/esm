"use strict"

require = require("../../../../")(module, true)
require("@babel/register")
console.log(require("./index.mjs").default)
