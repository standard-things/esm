const isWin = process.platform === "win32"

function isRelativePath(value) {
  if (typeof value !== "string") {
    return false
  }

  const { length } = value

  if (! length) {
    return false
  }

  let code = value.charCodeAt(0)

  if (code !== 46 /* . */) {
    return false
  }

  if (length === 1) {
    return true
  }

  code = value.charCodeAt(1)

  if (code === 46 /* . */) {
    if (length === 2) {
      return true
    }

    code = value.charCodeAt(2)
  }

  if (isWin &&
      code === 92 /* \ */) {
    return true
  }

  return code === 47 /* / */
}

export default isRelativePath
