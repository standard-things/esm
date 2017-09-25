"use strict"

const id = "../fixture/file-extension/a.mjs.gz"
delete require.cache[require.resolve(id)]
require(id)
