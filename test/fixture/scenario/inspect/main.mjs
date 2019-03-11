import { inspect } from "util"
import { log } from "console"

log("inspect:" + inspect({ [inspect.custom]: () => "true" }))
