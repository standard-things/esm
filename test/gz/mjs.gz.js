"use strict"

const filename = "../fixture/gz/a.mjs.gz"
delete require.cache[filename]
module.exports = require(filename)
