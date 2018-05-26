import { env as processEnv } from "../safe/process.js"
import shared from "../shared.js"

function isDevelopment() {
  const { env } = shared

  return Reflect.has(env, "development")
    ? env.development
    : env.development = processEnv.NODE_ENV !== "production"
}

export default isDevelopment
