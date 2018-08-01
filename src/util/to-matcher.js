import isRegExp from "./is-regexp.js"
import shared from "../shared.js"

function init() {
  function toMatcher(source) {
    if (typeof source === "function") {
      return (value) => source(value)
    }

    if (isRegExp(source)) {
      return (value) => source.test(value)
    }

    return (value) => value === source
  }

  return toMatcher
}

export default shared.inited
  ? shared.module.utilToMatcher
  : shared.module.utilToMatcher = init()
