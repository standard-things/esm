import { unlinkSync } from "fs"

function removeFile(filename) {
  try {
    unlinkSync(filename)
    return true
  } catch (e) {}
  return false
}

export default removeFile
