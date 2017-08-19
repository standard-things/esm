import Visitor from "../visitor.js"

import getNamesFromPattern from "../parse/get-names-from-pattern.js"
import raise from "../parse/raise.js"

class AssignmentVisitor extends Visitor {
  reset(rootPath, options) {
    this.exportedLocalNames = options.exportedLocalNames
    this.importedLocalNames = options.importedLocalNames
    this.magicString = options.magicString
    this.runtimeAlias = options.runtimeAlias
  }

  visitAssignmentExpression(path) {
    this.visitChildren(path)
    assignmentHelper(this, path, "left")
  }

  visitCallExpression(path) {
    this.visitChildren(path)

    const callee = path.getValue().callee
    if (callee.type === "Identifier" &&
        callee.name === "eval") {
      wrap(this, path)
    }
  }

  visitUpdateExpression(path) {
    this.visitChildren(path)
    assignmentHelper(this, path, "argument")
  }
}

function assignmentHelper(visitor, path, childName) {
  const node = path.getValue()
  const child = node[childName]
  const exportedNames = visitor.exportedLocalNames
  const importedNames = visitor.importedLocalNames
  const names = getNamesFromPattern(child)

  // Perform checks, which may throw errors, before source transformations.
  for (const name of names) {
    if (importedNames[name] === true &&
        ! isShadowed(path, name)) {
      const parser = {
        input: visitor.magicString.original,
        pos: node.start,
        start: node.start
      }

      raise(parser, parser.start, "Assignment to constant variable.", TypeError)
    }
  }

  // Wrap assignments to exported identifiers with `runtime.update()`.
  for (const name of names) {
    if (exportedNames[name] === true &&
        ! isShadowed(path, name)) {
      wrap(visitor, path)
      return
    }
  }
}

function hasNamed(nodes, name) {
  for (const node of nodes) {
    const identifier = node.type === "VariableDeclarator" ? node.id : node

    if (identifier.name === name) {
      return true
    }
  }

  return false
}

const hasParameter = memoize((node, name) =>
  hasNamed(node.params, name)
)

const hasVariable = memoize((node, name) => {
  const body = node.body

  for (const stmt of body) {
    if (stmt.type === "VariableDeclaration" &&
        hasNamed(stmt.declarations, name)) {
      return true
    }
  }

  return false
})

function isShadowed(path, name) {
  let shadowed = false

  path.getParentNode((parent) => {
    const type = parent.type

    if (type === "BlockStatement") {
      return shadowed = hasVariable(parent, name)
    }

    if (type === "FunctionDeclaration" ||
        type === "FunctionExpression" ||
        type === "ArrowFunctionExpression") {
      return shadowed = hasParameter(parent, name)
    }

    return false
  })

  return shadowed
}

function memoize(func) {
  const cacheMap = new WeakMap

  return (node, name) => {
    let names = cacheMap.get(node)

    if (names === void 0) {
      names = Object.create(null)
      cacheMap.set(node, names)
    }

    return name in names
      ? names[name]
      : names[name] = func(node, name)
  }
}

function wrap(visitor, path) {
  const node = path.getValue()

  visitor.magicString
    .prependRight(node.start, visitor.runtimeAlias + ".u(")
    .prependRight(node.end, ")")
}

export default new AssignmentVisitor
