import { log } from "console"

const actual =
  this === void 0 &&
  typeof __dirname === "undefined" &&
  typeof __filename === "undefined" &&
  typeof arguments === "undefined" &&
  typeof exports === "undefined" &&
  typeof module === "undefined" &&
  typeof require === "undefined"

log("esm-options:" + actual)
