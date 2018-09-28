import getNamesFromPattern from "../parse/get-names-from-pattern.js"
import shared from "../shared.js"

function init() {
  function getShadowed(path, name, map) {
    const isArgs = name === "arguments"

    let shadowed = null

    path.getParentNode((parent) => {
      const { type } = parent

      if (type === "WithStatement") {
        const node = path.getValue()

        shadowed = parent.object === node
          ? null
          : parent

        return shadowed
      }

      let cache = map.get(parent)

      if (! cache) {
        cache = { __proto__: null }
        map.set(parent, cache)
      }

      const cached = cache[name]

      if (cached !== void 0) {
        return shadowed = cache[name]
      }

      const isNonArrowFunc =
        type === "FunctionDeclaration" ||
        type === "FunctionExpression"

      if (isArgs &&
          isNonArrowFunc) {
        shadowed = parent
        return cache[name] = shadowed
      }

      if (type === "BlockStatement") {
        for (const stmt of parent.body) {
          if (stmt.type === "VariableDeclaration") {
            for (const declaration of stmt.declarations) {
              const varNames = getNamesFromPattern(declaration.id)

              for (const varName of varNames) {
                if (varName === name) {
                  shadowed = declaration
                  return cache[name] = shadowed
                }
              }
            }
          }
        }
      }

      if (type === "CatchClause") {
        const { param } = parent

        if (param !== null &&
            param.name === name) {
          shadowed = param
          return cache[name] = shadowed
        }
      }

      if (isNonArrowFunc) {
        const { id } = parent

        // Exported function declarations may not have an id.
        // For example, `export default function () {}`.
        if (id !== null &&
            id.name === name) {
          shadowed = parent
          return cache[name] = shadowed
        }
      }

      if (isNonArrowFunc ||
          type === "ArrowFunctionExpression") {
        for (const param of parent.params) {
          const [paramName] = getNamesFromPattern(param)

          if (paramName === name) {
            shadowed = param
            return cache[name] = shadowed
          }
        }
      }

      return cache[name] = shadowed
    })

    return shadowed
  }

  return getShadowed
}

export default shared.inited
  ? shared.module.parseGetShadowed
  : shared.module.parseGetShadowed = init()
