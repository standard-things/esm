const isWin = process.platform === "win32"
const fileProtocol = "file:" + (isWin ? "///" : "//")
const reBackSlash = /\\/g

function getURLFromFilePath(filePath) {
  return fileProtocol + filePath.replace(reBackSlash, "/")
}

export default getURLFromFilePath
