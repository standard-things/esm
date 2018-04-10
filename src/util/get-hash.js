import decodeURI from "./decode-uri.js"
import encodeURI from "./encode-uri.js"
import shared from "../shared.js"

function init() {
  const hashRegExp = /#.*$/

  function getHash(request) {
    const match = hashRegExp.exec(request)
    return match === null ? "" : decodeURI(encodeURI(match[0]))
  }

  return getHash
}

export default shared.inited
  ? shared.module.utilGetHash
  : shared.module.utilGetHash = init()
