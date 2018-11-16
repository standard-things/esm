import CHAR_CODE from "../constant/char-code.js"
import ENV from "../constant/env.js"

import decodeURIComponent from "./decode-uri-component.js"
import domainToUnicode from "./domain-to-unicode.js"
import hasEncodedSep from "../path/has-encoded-sep.js"
import { normalize } from "../safe/path.js"
import parseURL from "./parse-url.js"
import shared from "../shared.js"

function init() {
  const {
    COLON,
    FORWARD_SLASH,
    LOWERCASE_A,
    LOWERCASE_Z,
    UPPERCASE_A,
    UPPERCASE_Z
  } = CHAR_CODE

  const {
    WIN32
  } = ENV

  function getFilePathFromURL(url) {
    const parsed = typeof url === "string"
      ? parseURL(url)
      : url

    let { pathname } = parsed

    if (pathname === "" ||
        parsed.protocol !== "file:" ||
        hasEncodedSep(pathname)) {
      return ""
    }

    let { host } = parsed

    pathname = decodeURIComponent(pathname)

    // Section 2: Syntax
    // https://tools.ietf.org/html/rfc8089#section-2
    if (host !== "" &&
        host !== "localhost") {
      return WIN32
        ? "\\\\" + domainToUnicode(host) + normalize(pathname)
        : ""
    }

    if (! WIN32) {
      return pathname
    }

    // Section E.2: DOS and Windows Drive Letters
    // https://tools.ietf.org/html/rfc8089#appendix-E.2
    // https://tools.ietf.org/html/rfc8089#appendix-E.2.2
    if (pathname.length < 3 ||
        pathname.charCodeAt(2) !== COLON) {
      return ""
    }

    const code1 = pathname.charCodeAt(1)

    // Drive letters must be `[A-Za-z]:/`
    // All slashes of pathnames are forward slashes.
    if (((code1 >= UPPERCASE_A &&
          code1 <= UPPERCASE_Z) ||
        (code1 >= LOWERCASE_A &&
          code1 <= LOWERCASE_Z)) &&
        pathname.charCodeAt(3) === FORWARD_SLASH){
      return normalize(pathname).slice(1)
    }

    return ""
  }

  return getFilePathFromURL
}

export default shared.inited
  ? shared.module.utilGetFilePathFromURL
  : shared.module.utilGetFilePathFromURL = init()
