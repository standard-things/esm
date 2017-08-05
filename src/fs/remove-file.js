import { unlinkSync } from "fs"

function removeFile(filePath) {
  try {
    unlinkSync(filePath)
    return true
  } catch (e) {}
  return false
}

export default removeFile
