import getNamesFromPattern from "../parse/get-names-from-pattern.js"
import shared from "../shared.js"

function init() {
  function getShadowed(path, name, map) {
    const isArgs = name === "arguments"

    let result = null

    path.getParentNode((parent) => {
      const { type } = parent

      if (type === "WithStatement") {
        const node = path.getValue()

        result = parent.object === node
          ? null
          : parent

        return result !== null
      }

      let cache = map.get(parent)

      if (cache === void 0) {
        cache = new Map
        map.set(parent, cache)
      }

      let cached = cache.get(name)

      if (cached !== void 0) {
        result = cached

        return result !== null
      }

      const isFuncExpr = type === "FunctionExpression"

      const isNonArrowFunc =
        isFuncExpr ||
        type === "FunctionDeclaration"

      if (isArgs &&
          isNonArrowFunc) {
        result = parent
        cache.set(name, result)

        return true
      }

      if (type === "BlockStatement") {
        for (const stmt of parent.body) {
          if (stmt.type === "VariableDeclaration") {
            for (const declaration of stmt.declarations) {
              const varNames = getNamesFromPattern(declaration.id)

              for (const varName of varNames) {
                if (varName === name) {
                  result = declaration
                  cache.set(name, result)

                  return true
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
          result = param
          cache.set(name, result)

          return true
        }
      }

      if (isFuncExpr) {
        const { id } = parent

        // Exported function declarations may not have an id.
        // For example, `export default function () {}`.
        if (id !== null &&
            id.name === name) {
          result = parent
          cache.set(name, result)

          return true
        }
      }

      if (isNonArrowFunc ||
          type === "ArrowFunctionExpression") {
        for (const param of parent.params) {
          const [paramName] = getNamesFromPattern(param)

          if (paramName === name) {
            result = param
            cache.set(name, result)

            return true
          }
        }
      }

      cache.set(name, null)
    })

    return result
  }

  return getShadowed
}

export default shared.inited
  ? shared.module.parseGetShadowed
  : shared.module.parseGetShadowed = init()
