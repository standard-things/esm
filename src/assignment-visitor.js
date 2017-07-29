import Parser from "./parser.js"
import Visitor from "./visitor.js"

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

  let i = -1
  const names = Parser.getNamesFromPattern(child)
  const nameCount = names.length

  // Perform checks, which may throw errors, before source transformations.
  while (++i < nameCount) {
    const name = names[i]

    if (importedNames[name] === true &&
        ! isShadowed(path, name)) {
      const parser = {
        input: visitor.magicString.original,
        pos: node.start,
        start: node.start
      }

      Parser.raise(parser, parser.start, "Assignment to constant variable.", TypeError)
    }
  }

  i = -1

  // Wrap assignments to exported identifiers with runtime.update().
  while (++i < nameCount) {
    const name = names[i]

    if (exportedNames[name] === true &&
        ! isShadowed(path, name)) {
      wrap(visitor, path)
      return
    }
  }
}

function hasNamed(nodes, name) {
  let i = -1
  const nodeCount = nodes.length

  while (++i < nodeCount) {
    const node = nodes[i]
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
  let i = -1
  const body = node.body
  const stmtCount = body.length

  while (++i < stmtCount) {
    const stmt = body[i]

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

export default AssignmentVisitor
