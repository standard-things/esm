"use strict"

// Based on a similar API provided by ast-types.
// Copyright Ben Newman. Released under MIT license:
// https://github.com/benjamn/ast-types/blob/master/lib/path-visitor.js

const utils = require("./utils.js")
const codeOfUnderscore = "_".charCodeAt(0)
const childrenToVisit = [
  "alternate",
  "argument",
  "arguments",
  "block",
  "body",
  "callee",
  "cases",
  "consequent",
  "declaration",
  "declarations",
  "elements",
  "expression",
  "init",
  "object"
]

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
    if (! path.valueIsNode()) {
      return
    }

    const node = path.getValue()
    let childCount = childrenToVisit.length

    while (childCount--) {
      const key = childrenToVisit[childCount]
      if (key in node && utils.isObject(node[key])) {
        path.call(this.visitWithoutReset, key)
      }
    }
  }
}

Object.setPrototypeOf(Visitor.prototype, null)

module.exports = Visitor
