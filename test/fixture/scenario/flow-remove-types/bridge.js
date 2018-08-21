"use strict"

require = require("../../../../")(module, { cjs:true, mode: "auto" })
require("flow-remove-types/register")
require("./main.js")
