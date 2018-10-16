"use strict"

function arrayRemove(array, iteratee) {
  let length = array ? array.length : 0

  while (length--) {
    if (iteratee(array[length])) {
      array.splice(length, 1)
    }
  }
}

module.exports = arrayRemove
