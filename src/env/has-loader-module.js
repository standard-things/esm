import isOwnPath from "../util/is-own-path.js"
import matches from "../util/matches.js"
import shared from "../shared.js"

function init() {
  function hasLoaderModule(modules) {
    return matches(modules, ({ filename }) => isOwnPath(filename))
  }

  return hasLoaderModule
}

export default shared.inited
  ? shared.module.envHasLoaderModule
  : shared.module.envHasLoaderModule = init()
