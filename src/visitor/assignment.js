import NullObject from "../null-object.js"
import SafeWeakMap from "../safe-weak-map.js"
import Visitor from "../visitor.js"

import getNamesFromPattern from "../parse/get-names-from-pattern.js"
import raise from "../parse/raise.js"

const shadowedMap = new SafeWeakMap

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
  const body = node.body

  for (const stmt of body) {
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
    .prependRight(node.start, visitor.runtimeAlias + ".u(")
    .prependRight(node.end, ")")
}

export default new AssignmentVisitor
