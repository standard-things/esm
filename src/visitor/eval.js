import Visitor from "../visitor.js"

import isIdentifer from "../parse/is-identifier.js"
import getShadowed from "../parse/get-shadowed.js"
import overwrite from "../parse/overwrite.js"
import shared from "../shared.js"

function init() {
  const shadowedMap = new Map

  class EvalVisitor extends Visitor {
    reset(options) {
      this.addedImportExport = false
      this.changed = false
      this.magicString = null
      this.possibleIndexes = null
      this.runtimeName = null
      this.strict = false

      if (options) {
        this.addedImportExport = options.addedImportExport
        this.magicString = options.magicString
        this.possibleIndexes = options.possibleIndexes
        this.runtimeName = options.runtimeName
        this.strict = options.strict
      }
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

      const { end, start } = node
      const { magicString, runtimeName } = this

      const code = this.strict
        ? runtimeName + ".c"
        : "(eval===" + runtimeName + ".v?" + runtimeName + ".c:" + runtimeName + ".k)"

      magicString
        .prependLeft(callee.end, "(" + code)
        .prependRight(end, ")")

      if (this.addedImportExport) {
        magicString
          .prependLeft(start, runtimeName + ".u(")
          .prependRight(end, ")")
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

      if ((type === "UnaryExpression" &&
           parent.operator === "typeof") ||
          ! isIdentifer(node, parent) ||
          getShadowed(path, "eval", shadowedMap)) {
        return
      }

      // Support indirect eval:
      // o = { eval }
      // o.e = eval
      // f(eval)
      // (0, eval)(code)
      this.changed = true

      const { end, start } = node
      const { runtimeName } = this

      const code = this.strict
        ? runtimeName + ".e"
        : "(eval===" + runtimeName + ".v?" + runtimeName + ".e:eval)"

      if (type === "Property" &&
          parent.shorthand) {
        this.magicString.prependLeft(end, ":" + code)
      } else {
        overwrite(this, start, end, code)
      }
    }
  }

  return new EvalVisitor
}

export default shared.inited
  ? shared.module.visitorEval
  : shared.module.visitorEval = init()
