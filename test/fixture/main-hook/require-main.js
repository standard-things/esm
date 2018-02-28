"use strict"

const actual = Reflect.has(require, "main")

console.log("require-main:" + actual)
