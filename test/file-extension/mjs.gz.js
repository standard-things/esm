"use strict"

const id = "../fixture/file-extension/a.mjs.gz"
delete require.cache[require.resolve(id)]
module.exports = require(id)
