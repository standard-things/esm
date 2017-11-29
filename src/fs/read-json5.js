import parseJSON5 from "../util/parse-json5.js"
import readFile from "./read-file.js"

function readJSON5(filePath) {
  const content = readFile(filePath, "utf8")
  return content === null ? content : parseJSON5(content)
}

export default readJSON5
