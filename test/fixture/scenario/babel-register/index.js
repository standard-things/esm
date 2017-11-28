"use strict"

require = require("../../../../")(module, true)
require("@babel/register")
module.exports = require("./index.mjs").default
