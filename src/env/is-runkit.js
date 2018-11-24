import has from "../util/has.js"
import { env } from "../safe/process.js"
import shared from "../shared.js"

function init() {
  function isRunkit() {
    return has(env, "RUNKIT_HOST")
  }

  return isRunkit
}

export default shared.inited
  ? shared.module.envIsRunkit
  : shared.module.envIsRunkit = init()
