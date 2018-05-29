import Visitor from "../visitor.js"

import getNamesFromPattern from "../parse/get-names-from-pattern.js"
import isIdentifer from "../parse/is-identifier.js"
import isShadowed from "../parse/is-shadowed.js"
import shared from "../shared.js"

function init() {
  const checked = new Set
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

      if (this.temporals[name] === true &&
          ! isShadowed(path, name, shadowedMap)) {
        maybeWrap(this, path)
      }
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

  function maybeWrap(visitor, path) {
    let node = path.getValue()

    const parent = path.getParentNode()
    const { type } = parent

    if ((type === "AssignmentExpression" &&
         parent.left === node) ||
        ! isIdentifer(node, parent)) {
      return
    }

    const { name } = node
    const { runtimeName } = visitor

    if (type === "Property") {
      if (parent.shorthand) {
        visitor.magicString
          .prependLeft(node.end, ":" + runtimeName + '.t("' + name + '",' + name + ")")

        return
      }
    } else if (type !== "SwitchCase" &&
        type !== "TemplateLiteral" &&
        ! type.endsWith("Expression") &&
        ! type.endsWith("Statement")) {
      path.getParentNode((parent) => {
        const { type } = parent

        if (type === "AssignmentExpression" ||
            type === "ExpressionStatement") {
          node = parent
          return true
        }
      })
    }

    if (checked.has(node)) {
      return
    }

    checked.add(node)

    visitor.magicString
      .prependRight(node.start, "(" + runtimeName + '.t("' + name + '",')
      .prependRight(node.end, "))")
  }

  return new TemporalVisitor
}

export default shared.inited
  ? shared.module.visitorTemporal
  : shared.module.visitorTemporal = init()
