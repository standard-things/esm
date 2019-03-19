import parseJSON from "../util/parse-json.js"
import readFile from "./read-file.js"
import shared from "../shared.js"

function init() {
  function readJSON(filename) {
    const content = readFile(filename, "utf8")

    return content === null
      ? null
      : parseJSON(content)
  }

  return readJSON
}

export default shared.inited
  ? shared.module.fsReadJSON
  : shared.module.fsReadJSON = init()
