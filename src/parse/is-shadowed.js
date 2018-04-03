import shared from "../shared.js"

function init() {
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

  function isShadowed(path, name, map) {
    let shadowed = false

    path.getParentNode((parent) => {
      let cache = map.get(parent)

      if (cache &&
          name in cache) {
        return shadowed = cache[name]
      } else {
        cache = { __proto__: null }
        map.set(parent, cache)
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

  return isShadowed
}

export default shared.inited
  ? shared.module.parseIsShadowed
  : shared.module.parseIsShadowed = init()
