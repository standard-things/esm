import shared from "../shared.js"

function init() {
  function isShadowed(path, name, map) {
    const isArguments = name === "arguments"

    let shadowed = false

    path.getParentNode((parent) => {
      const { type } = parent

      if (type === "WithStatement") {
        const node = path.getValue()

        return shadowed = parent.object !== node
      }

      let cache = map.get(parent)

      if (cache &&
          Reflect.has(cache, name)) {
        return shadowed = cache[name]
      } else {
        cache = { __proto__: null }
        map.set(parent, cache)
      }

      const isNonArrowFunc =
        type === "FunctionDeclaration" ||
        type === "FunctionExpression"

      if (isArguments &&
          isNonArrowFunc) {
        shadowed = true
      } else if (type === "BlockStatement") {
        shadowed = hasVariable(parent, name)
      } else if (isNonArrowFunc ||
          type === "ArrowFunctionExpression") {
        shadowed =
          isNamed(parent, name) ||
          hasNamed(parent.params, name)
      }

      return cache[name] = shadowed
    })

    return shadowed
  }

  function hasNamed(nodes, name) {
    for (const node of nodes) {
      if (isNamed(node, name)) {
        return true
      }
    }

    return false
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

  function isNamed(node, name) {
    const { type } = node

    if (type === "ArrowFunctionExpression") {
      return false
    }

    if (type === "VariableDeclarator") {
      return node.id.name === name
    }

    // Exported function declarations may not have an id.
    // For example, `export default function () {}`.
    if (type === "FunctionDeclaration" ||
        type === "FunctionExpression") {
      const { id } = node

      return id !== null && id.name === name
    }

    return node.name === name
  }

  return isShadowed
}

export default shared.inited
  ? shared.module.parseIsShadowed
  : shared.module.parseIsShadowed = init()
