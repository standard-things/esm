import CHAR_CODE from "../constant/char-code.js"

import isWin32 from "../env/is-win32.js"
import normalize from "./normalize.js"
import shared from "../shared.js"

function init() {
  const {
    BACKWARD_SLASH,
    FORWARD_SLASH
  } = CHAR_CODE

  const WIN32 = isWin32()

  function posixRelative(from, to) {
    const fromStart = 1
    const fromEnd = from.length
    const fromLen = fromEnd - fromStart

    let toStart = 1

    const toEnd = to.length
    const toLen = toEnd - toStart

    // Compare paths to find the longest common path from root.
    const length = fromLen < toLen
      ? fromLen
      : toLen

    let i = -1
    let lastCommonSep = -1

    while (++i <= length) {
      if (i === length) {
        if (toLen > length) {
          if (to.charCodeAt(toStart + i) === FORWARD_SLASH) {
            // We get here if `from` is the exact base path for `to`.
            // For example: from="/foo/bar" to="/foo/bar/baz"
            return to.slice(toStart + i + 1)
          } else if (i === 0) {
            // We get here if `from` is the root.
            // For example: from="/" to="/foo"
            return to.slice(toStart + i)
          }
        } else if (fromLen > length) {
          if (from.charCodeAt(fromStart + i) === FORWARD_SLASH) {
            // We get here if `to` is the exact base path for `from`.
            // For example: from="/foo/bar/baz" to="/foo/bar"
            lastCommonSep = i
          } else if (i === 0) {
            // We get here if `to` is the root.
            // For example: from="/foo" to="/"
            lastCommonSep = 0
          }
        }

        break
      }

      const fromCode = from.charCodeAt(fromStart + i)
      const toCode = to.charCodeAt(toStart + i)

      if (fromCode !== toCode) {
        break
      } else if (fromCode === FORWARD_SLASH) {
        lastCommonSep = i
      }
    }

    let out = ""

    // Generate the relative path based on the path difference between `to`
    // and `from`.
    i = fromStart + lastCommonSep

    while (++i <= fromEnd) {
      if (i === fromEnd ||
          from.charCodeAt(i) === FORWARD_SLASH) {
        out += out.length === 0
          ? ".."
          : "/.."
      }
    }

    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts.
    if (out.length !== 0) {
      return out + to.slice(toStart + lastCommonSep)
    }

    toStart += lastCommonSep

    if (to.charCodeAt(toStart) === FORWARD_SLASH) {
      ++toStart
    }

    return to.slice(toStart)
  }

  function win32Relative(from, to) {
    const fromEnd = from.length
    const toEnd = to.length

    const fromLowered = from.toLowerCase()
    const toLowered = to.toLowerCase()

    // Trim any leading backslashes.
    let fromStart = -1

    while (++fromStart < fromEnd) {
      if (from.charCodeAt(fromStart) !== BACKWARD_SLASH) {
        break
      }
    }

    const fromLen = fromEnd - fromStart

    // Trim any leading backslashes.
    let toStart = -1

    while (++toStart < toEnd) {
      if (to.charCodeAt(toStart) !== BACKWARD_SLASH) {
        break
      }
    }

    const toLen = toEnd - toStart

    // Compare paths to find the longest common path from root.
    const length = fromLen < toLen
      ? fromLen
      : toLen

    let i = -1
    let lastCommonSep = -1

    while (++i <= length) {
      if (i === length) {
        if (toLen > length) {
          if (to.charCodeAt(toStart + i) === BACKWARD_SLASH) {
            // We get here if `from` is the exact base path for `to`.
            // For example: from="C:\\foo\\bar" to="C:\\foo\\bar\\baz"
            return to.slice(toStart + i + 1)
          } else if (i === 2) {
            // We get here if `from` is the device root.
            // For example: from="C:\\" to="C:\\foo"
            return to.slice(toStart + i)
          }
        }
        if (fromLen > length) {
          if (from.charCodeAt(fromStart + i) === BACKWARD_SLASH) {
            // We get here if `to` is the exact base path for `from`.
            // For example: from="C:\\foo\\bar" to="C:\\foo"
            lastCommonSep = i
          } else if (i === 2) {
            // We get here if `to` is the device root.
            // For example: from="C:\\foo\\bar" to="C:\\"
            lastCommonSep = 3
          }
        }

        break
      }

      const fromCode = fromLowered.charCodeAt(fromStart + i)
      const toCode = toLowered.charCodeAt(toStart + i)

      if (fromCode !== toCode) {
        break
      }

      if (fromCode === BACKWARD_SLASH) {
        lastCommonSep = i
      }
    }

    // We found a mismatch before the first common path separator was seen, so
    // return the original `to`.
    if (i !== length &&
        lastCommonSep === -1) {
      return to
    }

    let out = ""

    if (lastCommonSep === -1) {
      lastCommonSep = 0
    }

    // Generate the relative path based on the path difference between `to` and
    // `from`.
    i = fromStart + lastCommonSep

    while (++i <= fromEnd) {
      if (i === fromEnd ||
          from.charCodeAt(i) === BACKWARD_SLASH) {
        out += out.length === 0
          ? ".."
          : "/.."
      }
    }

    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts.
    if (out.length > 0) {
      return out + normalize(to.slice(toStart + lastCommonSep))
    }

    toStart += lastCommonSep

    if (to.charCodeAt(toStart) === BACKWARD_SLASH) {
      ++toStart
    }

    return normalize(to.slice(toStart))
  }

  return WIN32
    ? win32Relative
    : posixRelative
}

export default shared.inited
  ? shared.module.pathRelative
  : shared.module.pathRelative = init()
