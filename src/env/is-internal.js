import shared from "../shared.js"

function isInternal() {
  const { env } = shared

  return Reflect.has(env, "internal")
    ? env.internal
    : env.internal = __non_webpack_module__.id.startsWith("internal/")
}

export default isInternal
