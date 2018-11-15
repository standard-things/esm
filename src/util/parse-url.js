import { URL, parse as legacyParse } from "../safe/url.js"

import CHAR_CODE from "../constant/char-code.js"

import shared from "../shared.js"

function init() {
  const {
    FORWARD_SLASH
  } = CHAR_CODE

  const useStandard = !! URL

  const legacyNames = [
    "hash",
    "host",
    "hostname",
    "href",
    "pathname",
    "port",
    "protocol",
    "search"
  ]

  function parse(url) {
    if (typeof url === "string" &&
        url.length > 1 &&
        url.charCodeAt(0) === FORWARD_SLASH &&
        url.charCodeAt(1) === FORWARD_SLASH) {
      // Prefix protocol relative URLs with "file:"
      url = "file:" + url
    }

    if (useStandard) {
      return new URL(url)
    }

    const result = legacyParse(url)

    for (const name of legacyNames) {
      if (typeof result[name] !== "string") {
        result[name] = ""
      }
    }

    return result
  }

  function parseURL(url) {
    const cacheKey = typeof url === "string" ? url : ""
    const cache = shared.memoize.utilParseURL

    let cached = cache.get(cacheKey)

    if (cached === void 0) {
      cached = parse(url)
      cache.set(cacheKey, cached)
    }

    return cached
  }

  return parseURL
}

export default shared.inited
  ? shared.module.utilParseURL
  : shared.module.utilParseURL = init()
