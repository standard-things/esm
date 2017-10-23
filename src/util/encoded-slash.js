const API = {
  posix: {
    encodedSlashRegExp: /%2f/i
  },
  win32: {
    encodedSlashRegExp: /%5c|%2f/i
  }
}

function encodedSlash(string, mode = "posix") {
  return typeof string === "string" &&
    API[mode].encodedSlashRegExp.test(string)
}

export default encodedSlash
