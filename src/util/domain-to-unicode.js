import binding from "../binding.js"
import url from "url"

let { domainToUnicode:_domainToUnicode } = url

if (typeof _domainToUnicode !== "function") {
  const { toUnicode } = binding.icu

  _domainToUnicode = typeof toUnicode === "function"
    ? (domain) => toUnicode(domain)
    : __non_webpack_require__("punycode").toUnicode
}

function domainToUnicode(domain) {
  return typeof domain === "string"
    ? _domainToUnicode(domain)
    : ""
}

export default domainToUnicode
