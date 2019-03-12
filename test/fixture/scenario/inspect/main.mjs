import { inspect } from "util"
import { log } from "console"

const customInspectSymbol = inspect.custom

const customInspectKey = typeof customInspectSymbol === "symbol"
  ? customInspectSymbol
  : "inspect"

log("inspect:" + inspect({ [customInspectKey]: () => "true" }))
