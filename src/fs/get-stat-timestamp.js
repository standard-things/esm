import GenericDate from "../generic/date.js"

import isObject from "../util/is-object.js"
import shared from "../shared.js"

function init() {
  function getStatTimestamp(stat, type) {
    if (! isObject(stat)) {
      return -1
    }

    const milliseconds = stat[type + "Ms"]

    // Add 0.5 to avoid rounding down.
    // https://github.com/nodejs/node/pull/12607
    return typeof milliseconds === "number"
      ? Math.round(milliseconds + 0.5)
      : GenericDate.getTime(stat[type])
  }

  return getStatTimestamp
}

export default shared.inited
  ? shared.module.fsGetStatTimestamp
  : shared.module.fsGetStatTimestamp = init()
