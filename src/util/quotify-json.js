import shared from "../shared.js"

function init() {
  const booleanLookup = {
    false: true,
    true: true
  }

  const quoteLookup = {
    __proto__: null,
    // eslint-disable-next-line sort-keys
    '"': true,
    "'": true
  }

  const unquotedRegExp = /(|[^a-zA-Z])([a-zA-Z]+)([^a-zA-Z]|)/g

  function quotifyJSON(string) {
    if (typeof string !== "string" ||
        ! string.length) {
      return string
    }

    return string.replace(unquotedRegExp, (match, prefix, value, suffix) => {
      if (! quoteLookup[prefix] &&
          ! booleanLookup[value] &&
          ! quoteLookup[suffix]) {
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
