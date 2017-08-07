import { posix, win32 } from "path"

import decodeURI from "./decode-uri.js"
import encodedSlash from "./encoded-slash.js"
import { parse } from "url"
import punycode from "../vendor/punycode/punycode.es6.js"

const API = {
  posix: { normalize: posix.normalize },
  win32: { normalize: win32.normalize }
}

const codeOfColon = ":".charCodeAt(0)
const { toUnicode } = punycode

function urlToPath(url, mode = "posix") {
  const { normalize } = API[mode]
  const parsed = parse(url)
  const pathname = decodeURI(parsed.pathname)

  if (! pathname ||
      parsed.protocol !== "file:" ||
      encodedSlash(pathname)) {
    return ""
  }

  let host = parsed.host

  // Section 2: Syntax
  // https://tools.ietf.org/html/rfc8089#section-2
  if (host === "localhost") {
    host = ""
  } if (host) {
    return mode === "win32"
      ? "\\\\" + toUnicode(host) + normalize(pathname)
      : ""
  }

  if (mode !== "win32") {
    return pathname
  }

  // Section E.2: DOS and Windows Drive Letters
  // https://tools.ietf.org/html/rfc8089#appendix-E.2
  // https://tools.ietf.org/html/rfc8089#appendix-E.2.2
  if (pathname.length < 3 ||
      pathname.charCodeAt(2) !== codeOfColon) {
    return ""
  }

  const code1 = pathname.charCodeAt(1)

  // Drive letters must be [a-zA-Z].
  return (code1 > 64 && code1 < 91) || (code1 > 96 && code1 < 123)
    ? normalize(pathname).slice(1)
    : ""
}

export default urlToPath
