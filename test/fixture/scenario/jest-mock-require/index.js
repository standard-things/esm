"use strict"

require("mock-require").stopAll()
require = require("../../../../")(module)
module.exports = require("./main.mjs")
