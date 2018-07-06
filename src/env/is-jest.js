import shared from "../shared.js"

function init() {
  function isJest() {
    const { env } = shared

    return Reflect.has(env, "jest")
      ? env.jest
      : env.jest = !! __jest__
  }

  return isJest
}

export default shared.inited
  ? shared.module.envIsJest
  : shared.module.envIsJest = init()
