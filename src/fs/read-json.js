import parseJSON from "../util/parse-json.js"
import readFile from "./read-file.js"

function readJSON(filePath) {
  const content = readFile(filePath, "utf8")
  return content === null ? content : parseJSON(content)
}

export default readJSON
