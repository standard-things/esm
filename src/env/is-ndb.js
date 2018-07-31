import shared from "../shared.js"
import { versions } from "../safe/process.js"

function init() {
  function isNdb() {
    const { env } = shared

    return Reflect.has(env, "ndb")
      ? env.ndb
      : env.ndb = Reflect.has(versions, "ndb")
  }

  return isNdb
}

export default shared.inited
  ? shared.module.envIsNdb
  : shared.module.envIsNdb = init()
