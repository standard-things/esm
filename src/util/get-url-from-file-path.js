// A simplified version of file-url.
// Copyright Sindre Sorhus. Released under MIT license:
// https://github.com/sindresorhus/file-url

import encodeURI from "./encode-uri.js"
import encodeURIComponent from "./encode-uri-component.js"
import { resolve } from "path"

const codeOfSlash = "/".charCodeAt(0)

const protocol = "file://"

const reBackSlash = /\\/g
const reQMarkHash = /[?#]/g

function getURLFromFilePath(filePath) {
  filePath = resolve(filePath).replace(reBackSlash, "/")

  if (filePath.charCodeAt(0) !== codeOfSlash) {
    filePath = "/" + filePath
  }

  // Section 3.3: Escape path components
  // https://tools.ietf.org/html/rfc3986#section-3.3
  return protocol + encodeURI(filePath).replace(reQMarkHash, encodeURIComponent)
}

export default getURLFromFilePath
