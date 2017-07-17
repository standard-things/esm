import fs from "fs"

function writeFile(filePath, bufferOrString, options) {
  try {
    fs.writeFileSync(filePath, bufferOrString, options)
    return true
  } catch (e) {}
  return false
}

export default writeFile
