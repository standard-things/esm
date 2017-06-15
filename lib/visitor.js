"use strict"

// Based on a similar API provided by ast-types.
// Copyright Ben Newman. Released under MIT license:
// https://github.com/benjamn/ast-types/blob/master/lib/path-visitor.js

const utils = require("./utils.js")

const childrenToVisit = Object.assign(Object.create(null), {
  "alternate": true,
  "argument": true,
  "arguments": true,
  "block": true,
  "body": true,
  "callee": true,
  "cases": true,
  "consequent": true,
  "declaration": true,
  "declarations": true,
  "elements": true,
  "expression": true,
  "init": true,
  "object": true
})

const keysWeakMap = new WeakMap

class Visitor {
  constructor() {
    const that = this
    const visit = this.visit
    const visitWithoutReset = this.visitWithoutReset
    const visitChildren = this.visitChildren

    // Avoid slower `Function#bind` for Node < 7.
    this.visit = function () {
      visit.apply(that, arguments)
    }

    this.visitWithoutReset = function (path) {
      visitWithoutReset.call(that, path)
    }

    this.visitChildren = function (path) {
      visitChildren.call(that, path)
    }
  }

  visit(path) {
    this.reset.apply(this, arguments)
    this.visitWithoutReset(path)
  }

  visitWithoutReset(path) {
    const value = path.getValue()
    if (Array.isArray(value)) {
      path.each(this.visitWithoutReset)
    } else if (path.getNode() === value) {
      const method = this["visit" + value.type]
      if (typeof method === "function") {
        // The method must call this.visitChildren(path) to continue traversing.
        method.call(this, path)
      } else {
        this.visitChildren(path)
      }
    }
  }

  visitChildren(path) {
    const node = path.getValue()
    let keys = getKeys(node)
    let keyCount = keys.length

    while (keyCount--) {
      const key = keys[keyCount]
      if (key in childrenToVisit && utils.isObject(node[key])) {
        path.call(this.visitWithoutReset, key)
      }
    }
  }
}

function getKeys(object) {
  let keys = keysWeakMap.get(object)
  if (keys === void 0) {
    keys = Object.keys(object)
    keysWeakMap.set(object, keys)
  }
  return keys
}

Object.setPrototypeOf(Visitor.prototype, null)

module.exports = Visitor
