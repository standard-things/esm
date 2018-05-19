import stat from "../fs/stat.js"

function isFile(thePath) {
  return stat(thePath) === 0
}

export default isFile
