import decodeURI from "./decode-uri.js"
import encodeURI from "./encode-uri.js"

const queryHashRegExp = /[?#].*$/

function getQueryHash(id) {
  const match = queryHashRegExp.exec(id)
  return match === null ? "" : decodeURI(encodeURI(match[0]))
}

export default getQueryHash
