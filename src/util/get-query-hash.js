import decodeURI from "../util/decode-uri.js"
import encodeURI from "../util/encode-uri.js"

const queryHashRegExp = /[?#].*$/

function getQueryHash(request) {
  const match = queryHashRegExp.exec(request)
  return match === null ? "" : decodeURI(encodeURI(match[0]))
}

export default getQueryHash
