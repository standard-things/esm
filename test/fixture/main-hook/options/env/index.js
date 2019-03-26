import { log } from "console"

let actual =
  this === void 0 &&
  typeof __dirname === "undefined" &&
  typeof __filename === "undefined" &&
  typeof arguments === "undefined" &&
  typeof exports === "undefined" &&
  typeof module === "undefined" &&
  typeof require === "undefined"

if (actual) {
  global.__dirname = 1
  global.__filename = 2
  global.arguments = 3
  global.exports = 4
  global.module = 5
  global.require = 6

  actual =
    __dirname === 1 &&
    __filename === 2 &&
    arguments === 3 &&
    exports === 4 &&
    module === 5 &&
    require === 6
}

log("esm-options:" + actual)
