import stat from "./stat.js"

function exists(thePath) {
  return stat(thePath) !== -1
}

export default exists
