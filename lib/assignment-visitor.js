"use strict"

const getOption = require("./options.js").get
const utils = require("./utils.js")
const Visitor = require("./visitor.js")

class AssignmentVisitor extends Visitor {
  reset(rootPath, options) {
    this.exportedLocalNames = getOption(options, "exportedLocalNames")
    this.magicString = getOption(options, "magicString")
    this.moduleAlias = getOption(options, "moduleAlias")

    if (this.exportedLocalNames === void 0) {
      this.exportedLocalNames = Object.create(null)
    }
  }

  visitAssignmentExpression(path) {
    return assignmentHelper(this, path, "left")
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
    return assignmentHelper(this, path, "argument")
  }
}

function assignmentHelper(visitor, path, childName) {
  visitor.visitChildren(path)

  const child = path.getValue()[childName]
  const names = utils.getNamesFromPattern(child)
  let nameCount = names.length

  // Wrap assignments to exported identifiers with `module.runSetters`.
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
    .prependRight(value.start, visitor.moduleAlias + ".runSetters(")
    .prependRight(value.end, ")")
}

module.exports = AssignmentVisitor
