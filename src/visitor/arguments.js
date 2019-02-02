import Visitor from "../visitor.js"

import isIdentifer from "../parse/is-identifier.js"
import isShadowed from "../parse/is-shadowed.js"
import maybeIdentifier from "../parse/maybe-identifier.js"
import overwrite from "../parse/overwrite.js"
import shared from "../shared.js"

function init() {
  const shadowedMap = new Map

  class ArgumentsVisitor extends Visitor {
    reset(options) {
      this.changed = false
      this.magicString = null
      this.possibleIndexes = null
      this.runtimeName = null
      this.undeclaredIdentifiers = null

      if (options !== void 0) {
        this.magicString = options.magicString
        this.possibleIndexes = options.possibleIndexes
        this.runtimeName = options.runtimeName
        this.undeclaredIdentifiers = options.undeclaredIdentifiers
      }
    }

    visitIdentifier(path) {
      const node = path.getValue()
      const { name } = node

      if (! Reflect.has(this.undeclaredIdentifiers, name) ||
          ! isIdentifer(node, parent) ||
          isShadowed(path, name, shadowedMap)) {
        return
      }

      const parent = path.getParentNode()
      const { runtimeName } = this

      if (parent.type === "UnaryExpression" &&
          parent.operator === "typeof") {
        this.changed = true

        // Use `runtimeName` as the voided expression for content sniffing
        // based on the presence of the runtime identifier.
        overwrite(this, node.start, node.end, "void " + runtimeName)
        return
      }

      maybeIdentifier(path, (node, parent) => {
        this.changed = true

        const { end, start } = node

        if (parent.shorthand) {
          this.magicString
            .prependLeft(
              end,
              ":" + runtimeName + '.t("' + name + '")'
            )

          return
        }

        let prefix
        let suffix

        if (parent.type === "NewExpression") {
          prefix = "("
          suffix = ")"
        } else {
          prefix = ""
          suffix = ""
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

  return new ArgumentsVisitor
}

export default shared.inited
  ? shared.module.visitorArguments
  : shared.module.visitorArguments = init()
