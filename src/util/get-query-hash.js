import decodeURI from "../builtin/decode-uri.js"
import encodeURI from "../builtin/encode-uri.js"

const queryHashRegExp = /[?#].*$/

function getQueryHash(id) {
  const match = queryHashRegExp.exec(id)
  return match === null ? "" : decodeURI(encodeURI(match[0]))
}

export default getQueryHash
