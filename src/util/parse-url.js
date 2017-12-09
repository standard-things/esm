import { Url, parse } from "url"

import shared from "../shared.js"

function parseURL(url) {
  const isURL = url instanceof Url
  const key = isURL ? url.href : url

  return key in shared.parseURL
    ? shared.parseURL[key]
    : shared.parseURL[key] = (isURL ? url : parse(url))
}

export default parseURL
