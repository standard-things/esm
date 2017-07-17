import fs from "fs"

function mkdir(dirPath) {
  try {
    fs.mkdirSync(dirPath)
    return true
  } catch (e) {}
  return false
}

export default mkdir
