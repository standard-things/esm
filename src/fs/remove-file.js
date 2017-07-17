import fs from "fs"

function removeFile(filePath) {
  try {
    fs.unlinkSync(filePath)
    return true
  } catch (e) {}
  return false
}

export default removeFile
