import ASCII from "../ascii.js"
import GenericRegExp from "../generic/regexp.js"
import GenericString from "../generic/string.js"

import decodeURIComponent from "../builtin/decode-uri-component.js"
import domainToUnicode from "./domain-to-unicode.js"
import hasEncodedSlash from "./has-encoded-slash.js"
import { normalize } from "path"
import parseURL from "./parse-url.js"
import shared from "../shared.js"

const {
  COLON,
  SLASH
} = ASCII

const localhostRegExp = /^\/\/localhost\b/

function getFilePathFromURL(url) {
  const parsed = parseURL(url)
  let { pathname } = parsed

  if (! pathname) {
    return ""
  }

  if (parsed.protocol !== "file:") {
    if (GenericRegExp.test(localhostRegExp, pathname)) {
      pathname = GenericString.slice(pathname, 11)
    } else {
      return ""
    }
  }

  if (hasEncodedSlash(pathname)) {
    return ""
  }

  let { host } = parsed
  const { win32 } = shared.env

  pathname = decodeURIComponent(pathname)

  // Section 2: Syntax
  // https://tools.ietf.org/html/rfc8089#section-2
  if (host === "localhost") {
    host = ""
  } if (host) {
    return win32
      ? "\\\\" + domainToUnicode(host) + normalize(pathname)
      : ""
  }

  if (! win32) {
    return pathname
  }

  // Section E.2: DOS and Windows Drive Letters
  // https://tools.ietf.org/html/rfc8089#appendix-E.2
  // https://tools.ietf.org/html/rfc8089#appendix-E.2.2
  if (pathname.length < 3 ||
      GenericString.charCodeAt(pathname, 2) !== COLON) {
    return ""
  }

  const code1 = GenericString.charCodeAt(pathname, 1)

  // Drive letters must be `[A-Za-z]:/`
  // All slashes of pathnames are forward slashes.
  if (((code1 > 64 && code1 < 91) || (code1 > 96 && code1 < 123)) &&
      GenericString.charCodeAt(pathname, 3) === SLASH){
    return GenericString.slice(normalize(pathname), 1)
  }

  return ""
}

export default getFilePathFromURL
