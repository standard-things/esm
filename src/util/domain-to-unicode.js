import binding from "../binding.js"
import { toUnicode as punycodeToUnicode } from "../safe/punycode.js"
import { domainToUnicode as urlDomainToUnicode } from "../safe/url.js"

let _domainToUnicode = urlDomainToUnicode

if (typeof _domainToUnicode !== "function") {
  _domainToUnicode = (domain) => {
    const { toUnicode } = binding.icu

    _domainToUnicode = typeof toUnicode === "function"
      ? toUnicode
      : punycodeToUnicode

    return _domainToUnicode(domain)
  }
}

function domainToUnicode(domain) {
  return typeof domain === "string"
    ? _domainToUnicode(domain)
    : ""
}

export default domainToUnicode
