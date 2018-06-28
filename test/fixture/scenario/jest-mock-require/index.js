"use strict"

const mock = require("mock-require")

mock.stopAll()

process.env.JEST_ENV = "JEST_ENV_VALUE"

require = require("../../../../")(module)
module.exports = require("./main.mjs")
