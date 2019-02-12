"use strict"

const { log } = require("console")

log(Promise.resolve())
log(new Map([[1, 2]]))
log(new Set([1]))
log(/a/i)
