import binding from "../binding.js"
import decodeURIComponent from "./decode-uri-component.js"
import hasEncodedSlash from "./has-encoded-slash.js"
import noDeprecationWarning from "../warning/no-deprecation-warning.js"
import parseURL from "./parse-url.js"
import path from "path"
import url from "url"

const codeOfColon = ":".charCodeAt(0)
const codeOfSlash = "/".charCodeAt(0)

const isWin = process.platform === "win32"
const localhostRegExp = /^\/\/localhost\b/

let { domainToUnicode } = url
const { normalize } = path[isWin ? "win32" : "posix"]

if (typeof domainToUnicode !== "function") {
  const icuBinding = binding.icu
  const toUnicode = noDeprecationWarning(() => icuBinding.toUnicode)

  domainToUnicode = typeof toUnicode === "function"
    ? (domain) => toUnicode.call(icuBinding, domain)
    : __non_webpack_require__("punycode").toUnicode
}

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
