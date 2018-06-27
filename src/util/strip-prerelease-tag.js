import shared from "../shared.js"

function init() {
  const nonDigitRegExp = /[^\d.]/g

  function stripPrereleaseTag(version) {
    return typeof version === "string"
      ? version.replace(nonDigitRegExp, "")
      : ""
  }

  return stripPrereleaseTag
}

export default shared.inited
  ? shared.module.utilStripPrereleaseTag
  : shared.module.utilStripPrereleaseTag = init()
