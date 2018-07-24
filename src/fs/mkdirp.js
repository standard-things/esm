import { dirname } from "../safe/path.js"
import isDirectory from "../util/is-directory.js"
import mkdir from "./mkdir.js"
import shared from "../shared.js"

function init() {
  function mkdirp(dirPath) {
    if (typeof dirPath !== "string") {
      return false
    }

    const paths = []

    while (true) {
      if (isDirectory(dirPath)) {
        break
      }

      paths.push(dirPath)

      const parentPath = dirname(dirPath)

      if (dirPath === parentPath) {
        break
      }

      dirPath = parentPath
    }

    let { length } = paths

    while (length--) {
      if (! mkdir(paths[length])) {
        return false
      }
    }

    return true
  }

  return mkdirp
}

export default shared.inited
  ? shared.module.fsMkdirp
  : shared.module.fsMkdirp = init()
