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
  return string ? encodedSlashRegExp.test(string) : false
}

export default encodedSlash
