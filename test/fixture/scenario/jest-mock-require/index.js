"use strict"

require("mock-require").stopAll()
require = require("../../../../index.js")(module)
module.exports = require("./main.mjs")
