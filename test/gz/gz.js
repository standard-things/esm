"use strict"

const assert = require("assert")

module.exports = () => {
  return Promise
    .resolve()
    .then(() => require("../fixture/gz/a.gz"))
    .then(() => require("../fixture/gz/a.js.gz"))
    .then(() => import("../fixture/gz/a.mjs.gz"))
}
