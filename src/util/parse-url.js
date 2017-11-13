import { Url, parse } from "url"

import FastObject from "../fast-object.js"

const parseCache = new FastObject

function parseURL(url) {
  const isURL = url instanceof Url
  const key = isURL ? url.href : url

  return key in parseCache
    ? parseCache[key]
    : parseCache[key] = (isURL ? url : parse(url))
}

export default parseURL
