"use strict"

const clone = require("./clone.js")
const copy = require("./copy.js")

function bootstrap() {
  return clone()
    .then(copy)
}

module.exports = bootstrap
