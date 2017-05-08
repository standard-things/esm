export { a, b as v } from "../misc/abc";

import { c as cee } from "../misc/abc.js";
cee += "ee";
export { cee as si, c };

function c() {
  return "c";
}
