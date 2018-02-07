"use strict"

require("../import/dynamic.js")
  .then(() => console.log("dynamic-import-cjs:true"))
  .catch((e) => console.log(e))
