import Visitor from "../visitor.js"

import getNamesFromPattern from "../parse/get-names-from-pattern.js"
import isShadowed from "../parse/is-shadowed.js"
import shared from "../shared.js"

function init() {
  const checkedMap = new Map
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
        wrapInCheck(this, path)
      }

      this.visitChildren(path)
    }

    visitExportDefaultDeclaration(path) {
      const node = path.getValue()

      this.magicString.prependRight(
        node.end,
        this.runtimeName + '.u(["default"]);'
      )
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
    }
  }

  function wrapInCheck(visitor, path) {
    let key
    let node = path.getValue()
    let useParent = false
    let wrapExpression = false

    const { name } = node

    const parent = path.getParentNode(({ type }) => {
      if (type === "ForStatement") {
        return true
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
          type === "CallExpression" ||
          type === "ExpressionStatement") {
        return useParent = true
      }
    })

    if (useParent) {
      node = parent

      if (key) {
        node = node[key]
      }
    }

    if (checkedMap.has(node)) {
      return
    }

    checkedMap.set(node, true)

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
