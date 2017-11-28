"use strict"

require = require("../../../../")(module, true)
require("@babel/register")
module.exports = require("./main").default
