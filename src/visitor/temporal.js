import Visitor from "../visitor.js"

import getNamesFromPattern from "../parse/get-names-from-pattern.js"
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
    let key
    let node = path.getValue()
    let noWrap = false
    let useParent = false
    let wrapExpression = false

    const { name } = node

    const parent = path.getParentNode(({ type }) => {
      if (type === "BinaryExpression" ||
          type === "CallExpression" ||
          type === "ForStatement" ||
          type === "ParenthesizedExpression" ||
          type === "SwitchCase" ||
          type === "TemplateLiteral") {
        return true
      }

      if (type === "BreakStatement" ||
          type === "ContinueStatement" ||
          type === "LabeledStatement") {
        return noWrap = true
      }

      if (type === "NewExpression") {
        return wrapExpression = true
      }

      if (type === "ReturnStatement") {
        key = "argument"
        return useParent = true
      }

      if (type === "SwitchStatement") {
        key = "discriminant"
        return useParent = true
      }

      if (type === "DoWhileStatement" ||
          type === "IfStatement" ||
          type === "WhileStatement") {
        key = "test"
        return useParent = true
      }

      if (type === "AssignmentExpression" ||
          type === "ExpressionStatement" ||
          type === "ObjectExpression") {
        return useParent = true
      }
    })

    if (useParent) {
      node = parent

      if (key) {
        node = node[key]
      }
    }

    if (checked.has(node)) {
      return
    }

    checked.add(node)

    if (noWrap) {
      return
    }

    const prefix = wrapExpression ? "(" : ""
    const postfix = wrapExpression ? ")" : ""

    visitor.magicString
      .prependRight(node.start, prefix + visitor.runtimeName + '.t("' + name + '",')
      .prependRight(node.end, ")" + postfix)
  }

  return new TemporalVisitor
}

export default shared.inited
  ? shared.module.visitorTemporal
  : shared.module.visitorTemporal = init()
