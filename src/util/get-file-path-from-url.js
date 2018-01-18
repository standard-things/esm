import decodeURIComponent from "./decode-uri-component.js"
import domainToUnicode from "./domain-to-unicode.js"
import hasEncodedSlash from "./has-encoded-slash.js"
import parseURL from "./parse-url.js"
import path from "path"

const codeOfColon = ":".charCodeAt(0)
const codeOfSlash = "/".charCodeAt(0)

const isWin = process.platform === "win32"
const localhostRegExp = /^\/\/localhost\b/

const { normalize } = path[isWin ? "win32" : "posix"]

function getFilePathFromURL(url) {
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

  if (hasEncodedSlash(pathname)) {
    return ""
  }

  let { host } = parsed
  pathname = decodeURIComponent(pathname)

  // Section 2: Syntax
  // https://tools.ietf.org/html/rfc8089#section-2
  if (host === "localhost") {
    host = ""
  } if (host) {
    return isWin
      ? "\\\\" + domainToUnicode(host) + normalize(pathname)
      : ""
  }

  if (! isWin) {
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

export default getFilePathFromURL
