const nonDigitRegExp = /[^\d.]/g

function stripPrereleaseTag(version) {
  return typeof version === "string"
    ? version.replace(nonDigitRegExp, "")
    : ""
}

export default stripPrereleaseTag
