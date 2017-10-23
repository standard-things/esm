const encodedSlashRegExp = process.platform === "win32"
  ? /%5c|%2f/i
  : /%2f/i

function encodedSlash(string) {
  return typeof string === "string" && encodedSlashRegExp.test(string)
}

export default encodedSlash
