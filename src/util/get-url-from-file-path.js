// A simplified version of file-url.
// Copyright Sindre Sorhus. Released under MIT license:
// https://github.com/sindresorhus/file-url

import encodeURI from "./encode-uri.js"
import normalize from "../path/normalize.js"

const codeOfSlash = "/".charCodeAt(0)

const encodeCharsRegExp = /[?#]/g

const encodeCharMap = {
  "#": "%23",
  "?": "%3F"
}

function encodeChar(char) {
  return encodeCharMap[char]
}

function getURLFromFilePath(filePath) {
  filePath = normalize(filePath)

  if (filePath.charCodeAt(0) !== codeOfSlash) {
    filePath = "/" + filePath
  }

  // Section 3.3: Escape path components
  // https://tools.ietf.org/html/rfc3986#section-3.3
  return "file://" + encodeURI(filePath).replace(encodeCharsRegExp, encodeChar)
}

export default getURLFromFilePath
