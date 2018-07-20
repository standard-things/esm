"use strict"

const { log } = console

require("../import/dynamic.js")
  .then(() => log("dynamic-import-cjs:true"))
