import Visitor from "../visitor.js"

import isIdentifer from "../parse/is-identifier.js"
import isShadowed from "../parse/is-shadowed.js"
import overwrite from "../parse/overwrite.js"
import shared from "../shared.js"

function init() {
  const shadowedMap = new Map

  class EvalVisitor extends Visitor {
    reset(rootPath, options) {
      this.addedImportExport = options.addedImportExport
      this.changed = false
      this.magicString = options.magicString
      this.possibleIndexes = options.possibleIndexes
      this.runtimeName = options.runtimeName
      this.strict = options.strict
    }

    visitCallExpression(path) {
      const node = path.getValue()
      const { callee } = node

      if (callee.name !== "eval") {
        this.visitChildren(path)
        return
      }

      if (! node.arguments.length) {
        return
      }

      // Support direct eval:
      // eval(code)
      this.changed = true

      const { runtimeName } = this

      let code = runtimeName + ".c"

      if (! this.strict) {
        code = "(eval===" + runtimeName + ".v?" + code + ":" + runtimeName + ".k)"
      }

      this.magicString
        .prependLeft(callee.end, "(" + code)
        .prependLeft(node.end, ")")

      if (this.addedImportExport) {
        this.magicString
          .prependLeft(node.start, runtimeName + ".u(")
          .prependLeft(node.end, ")")
      }

      path.call(this, "visitWithoutReset", "arguments")
    }

    visitIdentifier(path) {
      const node = path.getValue()

      if (node.name !== "eval") {
        return
      }

      const parent = path.getParentNode()
      const { type } = parent

      if (type === "CallExpression" ||
          (type === "AssignmentExpression" &&
           parent.left === node) ||
          (type === "UnaryExpression" &&
           parent.operator === "typeof") ||
          ! isIdentifer(node, parent) ||
          isShadowed(path, "eval", shadowedMap)) {
        return
      }

      // Support indirect eval:
      // o = { eval }
      // o.e = eval
      // (0, eval)(code)
      this.changed = true

      const { runtimeName } = this

      let code = runtimeName + ".g"

      if (! this.strict) {
        code = "(eval===" + runtimeName + ".v?" + code + ":eval)"
      }

      if (type === "Property" &&
          parent.shorthand) {
        this.magicString.prependLeft(node.end, ":" + code)
      } else {
        overwrite(this, node.start, node.end, code)
      }
    }
  }

  return new EvalVisitor
}

export default shared.inited
  ? shared.module.visitorEval
  : shared.module.visitorEval = init()
