export { a, b as v } from "../abc.js"

import { c as cee } from "../abc.js"
cee += "ee"
export { cee as si, c }

function c() {
  return "c"
}
