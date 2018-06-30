import { log } from "console"
import { mainModule } from "process"

const actual = mainModule !== void 0

log("main-module:" + actual)
