import { env as processEnv } from "../safe/process.js"
import shared from "../shared.js"

function init() {
  function isDevelopment() {
    const { env } = shared

    return Reflect.has(env, "development")
      ? env.development
      : env.development = processEnv.NODE_ENV === "development"
  }

  return isDevelopment
}

export default shared.inited
  ? shared.module.envIsDevelopment
  : shared.module.envIsDevelopment = init()
