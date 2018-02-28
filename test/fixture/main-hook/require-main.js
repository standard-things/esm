"use strict"

const { log } = console
const actual = Reflect.has(require, "main")

log("require-main:" + actual)
