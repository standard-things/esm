const { declare } = require("@babel/helper-plugin-utils")

module.exports = declare((api) => {
  throw new Error("BABEL_ERROR")
})
