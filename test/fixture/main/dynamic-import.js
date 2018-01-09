"use strict"

Promise
  .all([
    require("../import/dynamic/cjs.js"),
    require("../import/dynamic/esm.js")
  ])
  .then(() => console.log("dynamic-import-cjs:true"))
  .catch((e) => console.log(e))
