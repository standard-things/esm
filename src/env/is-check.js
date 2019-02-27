import { argv } from "../safe/process.js"
import getFlags from "./get-flags.js"
import isPreloaded from "./is-preloaded.js"
import shared from "../shared.js"

function init() {
  function isCheck() {
    const { length } = argv

    return (length === 1 ||
            length === 2) &&
           getFlags().check &&
           isPreloaded()
  }

  return isCheck
}

export default shared.inited
  ? shared.module.envIsCheck
  : shared.module.envIsCheck = init()

