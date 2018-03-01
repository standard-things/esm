"use strict"

Reflect.deleteProperty(require.cache, __filename)
module.exports = "delete cache"
