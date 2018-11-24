import shared from "../shared.js"

function init() {
  const booleanLookup = new Set([
    "false",
    "true"
  ])

  const quoteLookup = new Set([
    '"',
    "'"
  ])

  const unquotedRegExp = /(|[^a-zA-Z])([a-zA-Z]+)([^a-zA-Z]|)/g

  function quotifyJSON(string) {
    if (typeof string !== "string" ||
        string === "") {
      return string
    }

    return string.replace(unquotedRegExp, (match, prefix, value, suffix) => {
      if (! quoteLookup.has(prefix) &&
          ! booleanLookup.has(value) &&
          ! quoteLookup.has(suffix)) {
        return prefix + '"' + value + '"' + suffix
      }

      return match
    })
  }

  return quotifyJSON
}

export default shared.inited
  ? shared.module.utilQuotifyJSON
  : shared.module.utilQuotifyJSON = init()
