import { realpathSync } from "fs"

function realpath(thePath) {
  try {
    return realpathSync(thePath)
  } catch (e) {}
  return ""
}

export default realpath
