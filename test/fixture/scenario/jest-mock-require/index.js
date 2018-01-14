"use strict"

const mock = require("mock-require")
mock.stopAll()

require = require("../../../../")(module)
module.exports = require("./main.mjs").default
