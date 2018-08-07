import Visitor from "../visitor.js"

import errors from "../parse/errors.js"
import getNamesFromPattern from "../parse/get-names-from-pattern.js"
import isShadowed from "../parse/is-shadowed.js"
import shared from "../shared.js"

function init() {
  const shadowedMap = new Map

  class AssignmentVisitor extends Visitor {
    reset(options) {
      this.assignableExports = null
      this.importedLocals = null
      this.magicString = null
      this.possibleIndexes = null
      this.runtimeName = null

      if (options) {
        this.assignableExports = options.assignableExports
        this.importedLocals = options.importedLocals
        this.magicString = options.magicString
        this.possibleIndexes = options.possibleIndexes
        this.runtimeName = options.runtimeName
      }
    }

    visitAssignmentExpression(path) {
      checkAndMaybeWrap(this, path, "left")
      path.call(this, "visitWithoutReset", "right")
    }

    visitUpdateExpression(path) {
      checkAndMaybeWrap(this, path, "argument")
    }
  }

  function checkAndMaybeWrap(visitor, path, childName) {
    const { assignableExports, importedLocals, magicString } = visitor
    const node = path.getValue()
    const names = getNamesFromPattern(node[childName])
    const { end, start } = node

    // Perform checks, which may throw errors, before source transformations.
    for (const name of names) {
      if (Reflect.has(importedLocals, name) &&
          ! isShadowed(path, name, shadowedMap)) {
        throw new errors.TypeError(
          magicString.original,
          start,
          "Assignment to constant variable."
        )
      }
    }

    for (const name of names) {
      if (assignableExports[name] &&
          ! isShadowed(path, name, shadowedMap)) {
        // Wrap assignments to exported identifiers.
        magicString
          .prependLeft(start, visitor.runtimeName + ".u(")
          .prependLeft(end, ")")

        return
      }
    }
  }

  return new AssignmentVisitor
}

export default shared.inited
  ? shared.module.visitorAssignment
  : shared.module.visitorAssignment = init()
