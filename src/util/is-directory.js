import stat from "../fs/stat.js"

function isDirectory(thePath) {
  return stat(thePath) === 1
}

export default isDirectory
