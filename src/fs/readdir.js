import fs from "fs"

function readdir(dirPath) {
  try {
    return fs.readdirSync(dirPath)
  } catch (e) {}
  return null
}

export default readdir
