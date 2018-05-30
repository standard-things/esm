import Visitor from "../visitor.js"

import errors from "../parse/errors.js"
import getNamesFromPattern from "../parse/get-names-from-pattern.js"
import isShadowed from "../parse/is-shadowed.js"
import shared from "../shared.js"

function init() {
  const shadowedMap = new Map

  class AssignmentVisitor extends Visitor {
    reset(rootPath, options) {
      this.assignableExports = options.assignableExports
      this.importLocals = options.importLocals
      this.magicString = options.magicString
      this.possibleIndexes = options.possibleIndexes
      this.runtimeName = options.runtimeName
    }

    visitAssignmentExpression(path) {
      assignmentHelper(this, path, "left")
      this.visitChildren(path)
    }

    visitUpdateExpression(path) {
      assignmentHelper(this, path, "argument")
      this.visitChildren(path)
    }
  }

  function assignmentHelper(visitor, path, childName) {
    const { assignableExports, importLocals } = visitor
    const node = path.getValue()
    const child = node[childName]
    const names = getNamesFromPattern(child)

    // Perform checks, which may throw errors, before source transformations.
    for (const name of names) {
      if (importLocals[name] === true &&
          ! isShadowed(path, name, shadowedMap)) {
        throw new errors.TypeError(
          visitor.magicString.original,
          node.start,
          "Assignment to constant variable."
        )
      }
    }

    for (const name of names) {
      if (assignableExports[name] === true &&
          ! isShadowed(path, name, shadowedMap)) {
        // Wrap assignments to exported identifiers.
        wrap(visitor, path)
        return
      }
    }
  }

  function wrap(visitor, path) {
    const { end, start } = path.getValue()

    visitor.magicString
      .prependLeft(start, visitor.runtimeName + ".u(")
      .prependLeft(end, ")")
  }

  return new AssignmentVisitor
}

export default shared.inited
  ? shared.module.visitorAssignment
  : shared.module.visitorAssignment = init()
