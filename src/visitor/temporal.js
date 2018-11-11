import Visitor from "../visitor.js"

import getShadowed from "../parse/get-shadowed.js"
import maybeIdentifier from "../parse/maybe-identifier.js"
import overwrite from "../parse/overwrite.js"
import shared from "../shared.js"

function init() {
  const shadowedMap = new Map

  class TemporalVisitor extends Visitor {
    reset(options) {
      this.changed = false
      this.magicString = null
      this.possibleIndexes = null
      this.runtimeName = null
      this.temporalBindings = null

      if (options) {
        this.magicString = options.magicString
        this.possibleIndexes = options.possibleIndexes
        this.runtimeName = options.runtimeName
        this.temporalBindings = options.temporalBindings
      }
    }

    visitIdentifier(path) {
      const node = path.getValue()
      const { name } = node

      if (! this.temporalBindings[name] ||
          getShadowed(path, name, shadowedMap)) {
        return
      }

      const { magicString, runtimeName } = this

      maybeIdentifier(path, (node, parent) => {
        this.changed = true

        const { end, start } = node

        if (parent.shorthand) {
          magicString
            .prependLeft(
              end,
              ":" + runtimeName + '.a("' + name + '",' + name + ")"
            )

          return
        }

        let prefix
        let suffix

        if (parent.type === "NewExpression") {
          prefix = "("
          suffix = ")"
        } else {
          prefix =
          suffix = ""
        }

        const code =
          prefix +
          runtimeName + '.a("' + name + '",' + name + ")" +
          suffix

        overwrite(this, start, end, code)
      })
    }
  }

  return new TemporalVisitor
}

export default shared.inited
  ? shared.module.visitorTemporal
  : shared.module.visitorTemporal = init()
