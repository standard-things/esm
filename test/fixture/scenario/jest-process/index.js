"use strict"

process.env.JEST_ENV = "JEST_ENV_VALUE"

require = require("../../../../index.js")(module)
module.exports = require("./main.js")
