import { unlinkSync } from "fs"

function removeFile(filename) {
  if (typeof filename === "string") {
    try {
      unlinkSync(filename)
      return true
    } catch (e) {}
  }

  return false
}

export default removeFile
