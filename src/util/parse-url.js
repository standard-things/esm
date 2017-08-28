import { Url, parse } from "url"

import FastObject from "../fast-object.js"

const parseCache = new FastObject

function parseURL(url) {
  if (url instanceof Url) {
    return url
  }

  if (url in parseCache) {
    return parseCache[url]
  }

  return parseCache[url] = parse(url)
}

export default parseURL
