import { dirname as _dirname } from "path"

function dirname(mod) {
  const filePath = mod && mod.filename
  return typeof filePath === "string" ? _dirname(filePath) : "."
}

export default dirname
