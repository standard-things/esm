import { URL, parse } from "../safe/url.js"

import CHAR_CODE from "../constant/char-code.js"

import shared from "../shared.js"

function init() {
  const {
    FORWARD_SLASH
  } = CHAR_CODE

  const useURL = typeof URL === "function"

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

  function parseURL(url) {
    const cache = shared.memoize.utilParseURL

    let cached = cache.get(url)

    if (cached !== void 0) {
      return cached
    }

    if (typeof url === "string" &&
        url.length > 1 &&
        url.charCodeAt(0) === FORWARD_SLASH &&
        url.charCodeAt(1) === FORWARD_SLASH) {
      // Prefix protocol relative URLs with "file:"
      url = "file:" + url
    }

    cached = useURL
      ? new URL(url)
      : legacyFallback(url)

    cache.set(url, cached)

    return cached
  }

  function legacyFallback(url) {
    const result = parse(url)

    for (const name of legacyNames) {
      if (typeof result[name] !== "string") {
        result[name] = ""
      }
    }

    return result
  }

  return parseURL
}

export default shared.inited
  ? shared.module.utilParseURL
  : shared.module.utilParseURL = init()
