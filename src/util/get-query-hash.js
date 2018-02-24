import decodeURI from "../util/decode-uri.js"
import encodeURI from "../util/encode-uri.js"

const queryHashRegExp = /[?#].*$/

function getQueryHash(id) {
  const match = queryHashRegExp.exec(id)
  return match === null ? "" : decodeURI(encodeURI(match[0]))
}

export default getQueryHash
