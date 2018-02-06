import binding from "../binding.js"
import url from "url"

let _domainToUnicode = url.domainToUnicode

if (typeof _domainToUnicode !== "function") {
  _domainToUnicode = (domain) => {
    const { toUnicode } = binding.icu

    _domainToUnicode = typeof toUnicode === "function"
      ? (domain) => toUnicode(domain)
      : __non_webpack_require__("punycode").toUnicode

    return _domainToUnicode(domain)
  }
}

function domainToUnicode(domain) {
  return typeof domain === "string"
    ? _domainToUnicode(domain)
    : ""
}

export default domainToUnicode
