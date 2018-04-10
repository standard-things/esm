import decodeURI from "./decode-uri.js"
import encodeURI from "./encode-uri.js"
import shared from "../shared.js"

function init() {
  const queryRegExp = /\?.*$/

  function getQuery(request) {
    const match = queryRegExp.exec(request)

    if (match === null) {
      return ""
    }

    let query = match[0]

    const index = query.indexOf("#")

    if (index !== -1) {
      query = query.slice(0, index)
    }

    return decodeURI(encodeURI(query))
  }

  return getQuery
}

export default shared.inited
  ? shared.module.utilGetQuery
  : shared.module.utilGetQuery = init()
