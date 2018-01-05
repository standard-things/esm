"use strict"

const filePath = "../fixture/file-extension/a.mjs.gz"
delete require.cache[filePath]
module.exports = require(filePath)
