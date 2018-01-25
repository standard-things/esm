"use strict"

const filename = "../fixture/file-extension/a.mjs.gz"
delete require.cache[filename]
module.exports = require(filename)
