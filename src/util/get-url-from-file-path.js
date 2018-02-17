// A simplified version of file-url.
// Copyright Sindre Sorhus. Released under MIT license:
// https://github.com/sindresorhus/file-url

import ASCII from "../ascii.js"
import GenericString from "../generic/string.js"

import encodeURI from "../builtin/encode-uri.js"
import normalize from "../path/normalize.js"

const {
  SLASH
} = ASCII

const encodeCharsRegExp = /[?#]/g

const encodeCharMap = {
  "#": "%23",
  "?": "%3F"
}

function encodeChar(char) {
  return encodeCharMap[char]
}

function getURLFromFilePath(filename) {
  filename = normalize(filename)

  if (GenericString.charCodeAt(filename, 0) !== SLASH) {
    filename = "/" + filename
  }

  // Section 3.3: Escape Path Components
  // https://tools.ietf.org/html/rfc3986#section-3.3
  const encoded = encodeURI(filename)
  return "file://" + GenericString.replace(encoded, encodeCharsRegExp, encodeChar)
}

export default getURLFromFilePath
