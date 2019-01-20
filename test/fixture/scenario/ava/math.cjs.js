"use strict"

const add = (a, b) => a + b
const addBound = add.bind()

module.exports = {
  add,
  addBound
}
