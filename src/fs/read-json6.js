import parseJSON6 from "../util/parse-json6.js"
import readFile from "./read-file.js"
import shared from "../shared.js"

function init() {
  function readJSON6(filename) {
    const content = readFile(filename, "utf8")

    return content === null
      ? null
      : parseJSON6(content)
  }

  return readJSON6
}

export default shared.inited
  ? shared.module.fsReadJSON6
  : shared.module.fsReadJSON6 = init()
