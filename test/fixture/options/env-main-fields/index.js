import def1 from "main-fields"
import def2 from "main-fields-mjs"
import { log } from "console"

const actual =
  def1 === "module" &&
  def2 === "main"

log("esm-options-main-fields:" + actual)
