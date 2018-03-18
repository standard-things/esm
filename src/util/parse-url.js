import { Url, parse } from "../safe/url.js"

import shared from "../shared.js"

function parseURL(url) {
  const isURL = url instanceof Url

  if (! isURL &&
      typeof url !== "string") {
    url = ""
  }

  const cache = shared.memoize.parseURL
  const cacheKey = isURL ? url.href : url

  return cacheKey in cache
    ? cache[cacheKey]
    : cache[cacheKey] = (isURL ? url : parse(url))
}

export default parseURL
