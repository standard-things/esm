// Based on a similar API provided by ast-types.
// Copyright Ben Newman. Released under MIT license:
// https://github.com/benjamn/ast-types/blob/master/lib/path-visitor.js

import createOptions from "./util/create-options.js"
import isObject from "./util/is-object.js"
import keys from "./util/keys.js"

const childNamesMap = new WeakMap

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
  object: true
})

class Visitor {
  visit(path) {
    this.reset.apply(this, arguments)
    this.visitWithoutReset(path)
  }

  visitWithoutReset(path) {
    const value = path.getValue()

    if (Array.isArray(value)) {
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
    let i = -1
    const value = path.getValue()
    const names = getChildNames(value)
    const nameCount = names.length

    while (++i < nameCount) {
      path.call(this, "visitWithoutReset", names[i])
    }
  }
}

function getChildNames(value) {
  let childNames = childNamesMap.get(value)

  if (childNames !== void 0) {
    return childNames
  }

  let i = -1
  const names = keys(value)
  const nameCount = names.length
  childNames = []

  while (++i < nameCount) {
    const name = names[i]
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
