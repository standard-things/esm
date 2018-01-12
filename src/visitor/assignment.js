import NullObject from "../null-object.js"
import SafeWeakMap from "../safe-weak-map.js"
import Visitor from "../visitor.js"

import errors from "../parse/errors.js"
import getNamesFromPattern from "../parse/get-names-from-pattern.js"

const shadowedMap = new SafeWeakMap

class AssignmentVisitor extends Visitor {
  reset(rootPath, options) {
    this.assignableExports = options.assignableExports
    this.assignableImports = options.assignableImports
    this.magicString = options.magicString
    this.runtimeName = options.runtimeName
  }

  visitAssignmentExpression(path) {
    this.visitChildren(path)
    assignmentHelper(this, path, "left")
  }

  visitCallExpression(path) {
    this.visitChildren(path)

    const { callee } = path.getValue()

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
  const { assignableExports, assignableImports } = visitor
  const node = path.getValue()
  const child = node[childName]
  const names = getNamesFromPattern(child)

  // Perform checks, which may throw errors, before source transformations.
  for (const name of names) {
    if (assignableImports[name] === true &&
        ! isShadowed(path, name)) {
      throw new errors.TypeError(
        visitor.magicString.original,
        node.start,
        "Assignment to constant variable."
      )
    }
  }

  // Wrap assignments to exported identifiers with `runtime.update()`.
  for (const name of names) {
    if (assignableExports[name] === true &&
        ! isShadowed(path, name)) {
      wrap(visitor, path)
      return
    }
  }
}

function hasNamed(nodes, name) {
  for (const node of nodes) {
    const id = node.type === "VariableDeclarator" ? node.id : node

    if (id.name === name) {
      return true
    }
  }

  return false
}

function hasParameter(node, name) {
  return hasNamed(node.params, name)
}

function hasVariable(node, name) {
  for (const stmt of node.body) {
    if (stmt.type === "VariableDeclaration" &&
        hasNamed(stmt.declarations, name)) {
      return true
    }
  }

  return false
}

function isShadowed(path, name) {
  let shadowed = false

  path.getParentNode((parent) => {
    let cache = shadowedMap.get(parent)

    if (cache &&
        name in cache) {
      return shadowed = cache[name]
    } else {
      cache = new NullObject
      shadowedMap.set(parent, cache)
    }

    const { type } = parent

    if (type === "BlockStatement") {
      shadowed = hasVariable(parent, name)
    } else if (type === "FunctionDeclaration" ||
        type === "FunctionExpression" ||
        type === "ArrowFunctionExpression") {
      shadowed = hasParameter(parent, name)
    }

    return cache[name] = shadowed
  })

  return shadowed
}

function wrap(visitor, path) {
  const node = path.getValue()

  visitor.magicString
    .prependRight(node.start, visitor.runtimeName + ".u(")
    .prependRight(node.end, ")")
}

export default new AssignmentVisitor
