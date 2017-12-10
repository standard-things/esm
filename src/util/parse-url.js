import { Url, parse } from "url"

import shared from "../shared.js"

function parseURL(url) {
  const isURL = url instanceof Url
  const cacheKey = isURL ? url.href : url

  return cacheKey in shared.parseURL
    ? shared.parseURL[cacheKey]
    : shared.parseURL[cacheKey] = (isURL ? url : parse(url))
}

export default parseURL
