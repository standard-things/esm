import { Url, parse } from "../safe/url.js"

import shared from "../shared.js"

function parseURL(url) {
  const isURL = url instanceof Url

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

export default parseURL
