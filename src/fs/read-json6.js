import parseJSON6 from "../util/parse-json6.js"
import readFile from "./read-file.js"

function readJSON6(filePath) {
  const content = readFile(filePath, "utf8")
  return content === null ? content : parseJSON6(content)
}

export default readJSON6
