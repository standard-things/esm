"use strict"

// eslint-disable-next-line no-global-assign
require = require("../../../../")(module, true)
require("@babel/register")
module.exports = require("./main").default
