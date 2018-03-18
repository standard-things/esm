import { realpathSync } from "../safe/fs.js"

function realpath(thePath) {
  if (typeof thePath === "string") {
    try {
      return realpathSync(thePath)
    } catch (e) {}
  }

  return ""
}

export default realpath
