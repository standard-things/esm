import COMPILER from "../constant/compiler.js"

import Visitor from "../visitor.js"

import isIdentifer from "../parse/is-identifier.js"
import isShadowed from "../parse/is-shadowed.js"
import maybeIdentifier from "../parse/maybe-identifier.js"
import overwrite from "../parse/overwrite.js"
import shared from "../shared.js"

function init() {
  const {
    TRANSFORMS_UNDECLARED
  } = COMPILER

  const shadowedMap = new Map

  class UndeclaredVisitor extends Visitor {
    reset(options) {
      this.magicString = null
      this.possibleIndexes = null
      this.runtimeName = null
      this.transforms = 0
      this.undeclared = null

      if (options !== void 0) {
        this.magicString = options.magicString
        this.possibleIndexes = options.possibleIndexes
        this.runtimeName = options.runtimeName
        this.undeclared = options.undeclared
      }
    }

    visitIdentifier(path) {
      const node = path.getValue()
      const { name } = node

      if (! this.undeclared.has(name) ||
          ! isIdentifer(node, parent) ||
          isShadowed(path, name, shadowedMap)) {
        return
      }

      const parent = path.getParentNode()
      const { runtimeName } = this

      if (parent.type === "UnaryExpression" &&
          parent.operator === "typeof") {
        this.transforms |= TRANSFORMS_UNDECLARED

        // Use `runtimeName` as the voided expression for content sniffing
        // based on the presence of the runtime identifier.
        overwrite(this, node.start, node.end, "void " + runtimeName)
        return
      }

      maybeIdentifier(path, (node, parent) => {
        this.transforms |= TRANSFORMS_UNDECLARED

        const { end, start } = node

        if (parent.shorthand) {
          this.magicString
            .prependLeft(
              end,
              ":" + runtimeName + '.t("' + name + '")'
            )

          return
        }

        let prefix = ""
        let suffix = ""

        if (parent.type === "NewExpression") {
          prefix = "("
          suffix = ")"
        }

        overwrite(
          this,
          start,
          end,
          prefix + runtimeName + '.t("' + name + '")' + suffix
        )
      })
    }
  }

  return new UndeclaredVisitor
}

export default shared.inited
  ? shared.module.visitorUndeclared
  : shared.module.visitorUndeclared = init()
