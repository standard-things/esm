import Visitor from "../visitor.js"

import getNamesFromPattern from "../parse/get-names-from-pattern.js"
import getShadowed from "../parse/get-shadowed.js"
import keys from "../util/keys.js"
import maybeIdentifier from "../parse/maybe-identifier.js"
import overwrite from "../parse/overwrite.js"
import shared from "../shared.js"

function init() {
  const shadowedMap = new Map

  class TemporalVisitor extends Visitor {
    reset(options) {
      this.changed = false
      this.initedBindings = null
      this.magicString = null
      this.possibleIndexes = null
      this.runtimeName = null
      this.temporalBindings = null

      if (options !== void 0) {
        this.initedBindings = options.initedBindings
        this.magicString = options.magicString
        this.possibleIndexes = options.possibleIndexes
        this.runtimeName = options.runtimeName
        this.temporalBindings = options.temporalBindings
      }
    }

    visitIdentifier(path) {
      const node = path.getValue()
      const { name } = node

      if (! Reflect.has(this.temporalBindings, name) ||
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

    visitExportDefaultDeclaration(path) {
      const { initedBindings } = this

      if (initedBindings.default !== true) {
        initedBindings.default = true

        const node = path.getValue()

        this.magicString.appendRight(
          node.declaration.end,
          this.runtimeName + '.j(["default"]);'
        )
      }

      path.call(this, "visitWithoutReset", "declaration")
    }

    visitExportNamedDeclaration(path) {
      const node = path.getValue()
      const { declaration } = node
      const { initedBindings } = this

      const initees = { __proto__: null }

      if (declaration !== null) {
        const { type } = declaration

        if (type === "ClassDeclaration") {
          const { name } = declaration.id

          if (initedBindings[name] !== true) {
            initees[name] =
            initedBindings[name] = true
          }
        } else if (type === "VariableDeclaration") {
          for (const { id } of declaration.declarations) {
            const names = getNamesFromPattern(id)

            for (const name of names) {
              if (initedBindings[name] !== true) {
                initees[name] =
                initedBindings[name] = true
              }
            }
          }
        }
      }

      const names = keys(initees)

      if (names.length !== 0) {
        const { end } = declaration || node

        this.magicString.appendRight(
          end,
          ";" + this.runtimeName + ".j(" + JSON.stringify(names) + ");"
        )
      }

      if (declaration !== null) {
        path.call(this, "visitWithoutReset", "declaration")
      }
    }
  }

  return new TemporalVisitor
}

export default shared.inited
  ? shared.module.visitorTemporal
  : shared.module.visitorTemporal = init()
