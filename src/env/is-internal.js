import shared from "../shared.js"

function init() {
  function isInternal() {
    const { env } = shared

    return Reflect.has(env, "internal")
      ? env.internal
      : env.internal = __non_webpack_module__.id.startsWith("internal/")
  }

  return isInternal
}

export default shared.inited
  ? shared.module.envIsInternal
  : shared.module.envIsInternal = init()
