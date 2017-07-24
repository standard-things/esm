import Parser from "./parser.js"
import Visitor from "./visitor.js"

class AssignmentVisitor extends Visitor {
  reset(rootPath, options) {
    this.exportedLocalNames = options.exportedLocalNames
    this.magicString = options.magicString
    this.runtimeAlias = options.runtimeAlias

    if (this.exportedLocalNames === void 0) {
      this.exportedLocalNames = Object.create(null)
    }
  }

  visitAssignmentExpression(path) {
    this.visitChildren(path)
    assignmentHelper(this, path, "left")
  }

  visitCallExpression(path) {
    this.visitChildren(path)

    const callee = path.getValue().callee
    if (callee.type === "Identifier" &&
        callee.name === "eval") {
      wrap(this, path)
    }
  }

  visitUpdateExpression(path) {
    this.visitChildren(path)
    assignmentHelper(this, path, "argument")
  }
}

function assignmentHelper(visitor, path, childName) {
  const child = path.getValue()[childName]
  const names = Parser.getNamesFromPattern(child)
  let nameCount = names.length

  // Wrap assignments to exported identifiers with runtime.update().
  while (nameCount--) {
    if (visitor.exportedLocalNames[names[nameCount]] === true) {
      wrap(visitor, path)
      return
    }
  }
}

function wrap(visitor, path) {
  const value = path.getValue()

  visitor.magicString
    .prependRight(value.start, visitor.runtimeAlias + ".u(")
    .prependRight(value.end, ")")
}

export default AssignmentVisitor
