import parseJSON from "../util/parse-json.js"
import readFile from "./read-file.js"

function readJSON(filename) {
  const content = readFile(filename, "utf8")

  return content === null ? content : parseJSON(content)
}

export default readJSON
