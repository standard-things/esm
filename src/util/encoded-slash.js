const API = {
  posix: {
    encodedSlashRegExp: /%2f/i
  },
  win32: {
    encodedSlashRegExp: /%5c|%2f/i
  }
}

function encodedSlash(string, mode = "posix") {
  const { encodedSlashRegExp  } = API[mode]
  return typeof string === "string" && encodedSlashRegExp.test(string)
}

export default encodedSlash
