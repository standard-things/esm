import { URL, Url, parse as legacyParse } from "../safe/url.js"

import CHAR_CODE from "../constant/char-code.js"

import shared from "../shared.js"

function init() {
  const {
    FORWARD_SLASH
  } = CHAR_CODE

  const useStandard = !! URL

  function parse(url) {
    if (typeof url === "string" &&
        url.charCodeAt(0) === FORWARD_SLASH &&
        url.charCodeAt(1) === FORWARD_SLASH) {
      url = "file:" + url
    }

    return useStandard ? new URL(url) : legacyParse(url)
  }

  function parseURL(url) {
    const isURL =
      url instanceof Url ||
      (useStandard && url instanceof URL)

    if (! isURL &&
        typeof url !== "string") {
      url = ""
    }

    const cache = shared.memoize.utilParseURL
    const cacheKey = isURL ? url.href : url

    return Reflect.has(cache, cacheKey)
      ? cache[cacheKey]
      : cache[cacheKey] = (isURL ? url : parse(url))
  }

  return parseURL
}

export default shared.inited
  ? shared.module.utilParseURL
  : shared.module.utilParseURL = init()
