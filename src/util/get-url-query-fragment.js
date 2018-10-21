import decodeURI from "./decode-uri.js"
import encodeURI from "./encode-uri.js"
import shared from "../shared.js"

function init() {
  const questionMarkHashRegExp = /[?#]/

  function getURLQueryFragment(request) {
    const index = typeof request === "string"
      ? request.search(questionMarkHashRegExp)
      : -1

    return index === -1
      ? ""
      : decodeURI(encodeURI(request.slice(index)))
  }

  return getURLQueryFragment
}

export default shared.inited
  ? shared.module.utilGetURLQueryFragment
  : shared.module.utilGetURLQueryFragment = init()
