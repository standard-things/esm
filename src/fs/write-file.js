import { writeFileSync } from "fs"

function writeFile(filePath, bufferOrString, options) {
  try {
    writeFileSync(filePath, bufferOrString, options)
    return true
  } catch (e) {}
  return false
}

export default writeFile
