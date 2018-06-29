import Visitor from "../visitor.js"

import getNamesFromPattern from "../parse/get-names-from-pattern.js"
import isShadowed from "../parse/is-shadowed.js"
import maybeWrap from "../parse/maybe-wrap.js"
import shared from "../shared.js"

function init() {
  const shadowedMap = new Map

  class TemporalVisitor extends Visitor {
    reset(rootPath, options) {
      this.magicString = options.magicString
      this.possibleIndexes = options.possibleIndexes
      this.runtimeName = options.runtimeName
      this.temporals = options.temporals
    }

    visitIdentifier(path) {
      const node = path.getValue()
      const { name } = node

      if (this.temporals[name] !== true ||
          isShadowed(path, name, shadowedMap)) {
        return
      }

      const { magicString, runtimeName } = this

      maybeWrap(this, path, (node, parent) => {
        if (parent.shorthand) {
          magicString
            .prependLeft(
              node.end,
              ":" + runtimeName + '.a("' + name + '",' + name + ")"
            )

          return
        }

        const isNewExpression = parent.type === "NewExpression"
        const prefix = isNewExpression ? "(" : ""
        const postfix = isNewExpression ? ")" : ""

        magicString
          .prependRight(node.start, prefix + runtimeName + '.a("' + name + '",')
          .prependRight(node.end, ")" + postfix)
      })
    }

    visitExportDefaultDeclaration(path) {
      const node = path.getValue()

      this.magicString.prependRight(
        node.end,
        this.runtimeName + '.u(["default"]);'
      )

      path.call(this, "visitWithoutReset", "declaration")
    }

    visitExportNamedDeclaration(path) {
      const node = path.getValue()
      const { declaration } = node

      let names
      let child = node

      if (declaration) {
        const { type } = declaration

        child = declaration

        if (type === "ClassDeclaration") {
          names = [declaration.id.name]
        } else if (type === "VariableDeclaration") {
          names = []

          for (const { id } of declaration.declarations) {
            names.push(...getNamesFromPattern(id))
          }
        }
      } else if (node.source === null) {
        names = node.specifiers.map((specifier) => specifier.local.name)
      }

      if (names) {
        this.magicString.prependRight(
          child.end,
          ";" + this.runtimeName + ".u(" + JSON.stringify(names) + ");"
        )
      }

      if (declaration) {
        path.call(this, "visitWithoutReset", "declaration")
      }
    }
  }

  return new TemporalVisitor
}

export default shared.inited
  ? shared.module.visitorTemporal
  : shared.module.visitorTemporal = init()
