import { posix, win32 } from "path"

import decodeURIComponent from "./decode-uri-component.js"
import encodedSlash from "./encoded-slash.js"
import parseURL from "./parse-url.js"
import punycode from "../vendor/punycode/punycode.es6.js"

const codeOfColon = ":".charCodeAt(0)
const codeOfSlash = "/".charCodeAt(0)

const localhostRegExp = /^\/\/localhost\b/
const { toUnicode } = punycode

const API = {
  posix: { normalize: posix.normalize },
  win32: { normalize: win32.normalize }
}

function urlToPath(url, mode = "posix") {
  const { normalize } = API[mode]
  const parsed = parseURL(url)
  let { pathname } = parsed

  if (! pathname) {
    return ""
  }

  if (parsed.protocol !== "file:") {
    if (localhostRegExp.test(pathname)) {
      pathname = pathname.slice(11)
    } else {
      return ""
    }
  }

  if (encodedSlash(pathname)) {
    return ""
  }

  let { host } = parsed
  pathname = decodeURIComponent(pathname)

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

  // Drive letters must be `[A-Za-z]:/`
  // All slashes of pathnames are forward slashes.
  if (((code1 > 64 && code1 < 91) || (code1 > 96 && code1 < 123)) &&
      pathname.charCodeAt(3) === codeOfSlash){
    return normalize(pathname).slice(1)
  }

  return ""
}

export default urlToPath
