import getNamesFromPattern from "../parse/get-names-from-pattern.js"
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
        return cache[name] = shadowed
      }

      if (type === "BlockStatement") {
        for (const stmt of parent.body) {
          if (stmt.type === "VariableDeclaration") {
            for (const { id } of stmt.declarations) {
              const varNames = getNamesFromPattern(id)

              for (const varName of varNames) {
                if (varName === name) {
                  shadowed = true
                  return cache[name] = shadowed
                }
              }
            }
          }
        }
      }

      if (isNonArrowFunc ||
          type === "ArrowFunctionExpression") {
        if (type === "FunctionDeclaration" ||
            type === "FunctionExpression") {
          const { id } = parent

          // Exported function declarations may not have an id.
          // For example, `export default function () {}`.
          if (id !== null &&
              id.name === name) {
            shadowed = true
            return cache[name] = shadowed
          }
        }

        for (const param of parent.params) {
          const [paramName] = getNamesFromPattern(param)

          if (paramName === name) {
            shadowed = true
            return cache[name] = shadowed
          }
        }
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
