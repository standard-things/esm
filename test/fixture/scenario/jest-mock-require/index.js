require("mock-require").stopAll()

JEST_GLOBAL = "JEST_GLOBAL_VALUE"
process.env.JEST_ENV = "JEST_ENV_VALUE"

require = require("../../../../")(module)
module.exports = require("./main.mjs")
