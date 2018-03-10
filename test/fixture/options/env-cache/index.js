import { log } from "console"

const actual =
  this === void 0 &&
  typeof module === "undefined"

log("esm-options:" + actual)
