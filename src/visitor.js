// Based on a similar API provided by ast-types.
// Copyright Ben Newman. Released under MIT license:
// https://github.com/benjamn/ast-types/blob/master/lib/path-visitor.js

import SafeWeakMap from "./safe-weak-map.js"

import createOptions from "./util/create-options.js"
import isObject from "./util/is-object.js"
import keys from "./util/keys.js"

const { isArray } = Array

const childNamesMap = new SafeWeakMap

const childrenToVisit = createOptions({
  alternate: true,
  argument: true,
  arguments: true,
  block: true,
  body: true,
  callee: true,
  cases: true,
  consequent: true,
  declaration: true,
  declarations: true,
  elements: true,
  expression: true,
  init: true,
  left: true,
  object: true,
  properties: true,
  right: true,
  value: true
})

class Visitor {
  visit(path) {
    this.reset(...arguments)
    this.visitWithoutReset(path)
  }

  visitWithoutReset(path) {
    const value = path.getValue()

    if (! isObject(value)) {
      return
    }

    if (isArray(value)) {
      path.each(this, "visitWithoutReset")
      return
    }

    // The method must call this.visitChildren(path) to continue traversing.
    let methodName = "visit" + value.type

    if (typeof this[methodName] !== "function") {
      methodName = "visitChildren"
    }

    this[methodName](path)
  }

  visitChildren(path) {
    const value = path.getValue()
    const names = getChildNames(value)

    for (const name of names) {
      path.call(this, "visitWithoutReset", name)
    }
  }
}

function getChildNames(value) {
  let childNames = childNamesMap.get(value)

  if (childNames) {
    return childNames
  }

  const names = keys(value)
  childNames = []

  for (const name of names) {
    if (name in childrenToVisit &&
        isObject(value[name])) {
      childNames.push(name)
    }
  }

  childNamesMap.set(value, childNames)
  return childNames
}

Object.setPrototypeOf(Visitor.prototype, null)

export default Visitor
