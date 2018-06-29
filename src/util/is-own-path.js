import ESM from "../constant/esm.js"

const {
  PKG_FILENAMES
} = ESM

function isOwnPath(thePath) {
  if (typeof thePath === "string") {
    for (const filename of PKG_FILENAMES) {
      if (thePath === filename) {
        return true
      }
    }
  }

  return false
}

export default isOwnPath
