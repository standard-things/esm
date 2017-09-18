// A simplified version of file-url.
// Copyright Sindre Sorhus. Released under MIT license:
// https://github.com/sindresorhus/file-url

import createOptions from "./create-options.js"
import encodeURI from "./encode-uri.js"
import { resolve } from "path"

const codeOfSlash = "/".charCodeAt(0)

const reBackSlash = /\\/g
const reEncodeChars = /[?#]/g

const encodeCharMap = createOptions({
  "#": "%23",
  "?": "%3F"
})

function encodeChar(char) {
  return encodeCharMap[char]
}

function getURLFromFilePath(filePath) {
  filePath = resolve(filePath).replace(reBackSlash, "/")

  if (filePath.charCodeAt(0) !== codeOfSlash) {
    filePath = "/" + filePath
  }

  // Section 3.3: Escape path components
  // https://tools.ietf.org/html/rfc3986#section-3.3
  return "file://" + encodeURI(filePath).replace(reEncodeChars, encodeChar)
}

export default getURLFromFilePath
