// A simplified version of file-url.
// Copyright Sindre Sorhus. Released under MIT license:
// https://github.com/sindresorhus/file-url

import CHAR_CODE from "../constant/char-code.js"

import encodeURI from "./encode-uri.js"
import isSep from "../path/is-sep.js"
import normalize from "../path/normalize.js"
import { resolve } from "../safe/path.js"
import shared from "../shared.js"

function init() {
  const {
    FORWARD_SLASH
  } = CHAR_CODE

  const encodeCharsRegExp = /[?#]/g

  const encodeCharMap = new Map([
    ["#", "%23"],
    ["?", "%3F"]
  ])

  function encodeChar(char) {
    return encodeCharMap.get(char)
  }

  function getURLFromFilePath(filename) {
    let length = typeof filename === "string"
      ? filename.length
      : 0

    if (length === 0) {
      return "file:///"
    }

    const oldFilename = filename
    const oldLength = length

    filename = normalize(resolve(filename))

    // Section 3.3: Escape Path Components
    // https://tools.ietf.org/html/rfc3986#section-3.3
    filename = encodeURI(filename).replace(encodeCharsRegExp, encodeChar)
    length = filename.length

    if (filename.charCodeAt(length - 1) !== FORWARD_SLASH &&
        isSep(oldFilename.charCodeAt(oldLength - 1))) {
      filename += "/"
    }

    let i = -1

    // eslint-disable-next-line no-empty
    while (++i < length && filename.charCodeAt(i) === FORWARD_SLASH) {}

    if (i > 1) {
      filename = "/" + filename.slice(i)
    } else if (i === 0) {
      filename = "/" + filename
    }

    return "file://" + filename
  }

  return getURLFromFilePath
}

export default shared.inited
  ? shared.module.utilGetURLFromFilePath
  : shared.module.utilGetURLFromFilePath = init()
