const [,,args] = process.argv

const options = args && JSON.parse(args)

require = require("../../../../index.js")(module, options)
module.exports = require("./index.js")
