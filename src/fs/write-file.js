import { writeFileSync } from "fs"

function writeFile(filename, bufferOrString, options) {
  if (typeof filename === "string") {
    try {
      writeFileSync(filename, bufferOrString, options)
      return true
    } catch (e) {}
  }

  return false
}

export default writeFile
