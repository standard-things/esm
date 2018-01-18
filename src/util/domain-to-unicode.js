import binding from "../binding.js"
import noDeprecationWarning from "../warning/no-deprecation-warning.js"
import url from "url"

let { domainToUnicode:_domainToUnicode } = url

if (typeof _domainToUnicode !== "function") {
  const icuBinding = binding.icu
  const toUnicode = noDeprecationWarning(() => icuBinding.toUnicode)

  _domainToUnicode = typeof toUnicode === "function"
    ? (domain) => toUnicode.call(icuBinding, domain)
    : __non_webpack_require__("punycode").toUnicode
}

function domainToUnicode(domain) {
  return typeof domain === "string"
    ? _domainToUnicode(domain)
    : ""
}

export default domainToUnicode
