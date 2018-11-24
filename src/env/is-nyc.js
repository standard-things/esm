import has from "../util/has.js"
import { env } from "../safe/process.js"
import shared from "../shared.js"

function init() {
  function isNyc() {
    return has(env, "NYC_ROOT_ID")
  }

  return isNyc
}

export default shared.inited
  ? shared.module.envIsNyc
  : shared.module.envIsNyc = init()
