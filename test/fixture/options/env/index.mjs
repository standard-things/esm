import { log } from "console"

const actual = typeof module !== "undefined"

log("esm-options:" + actual)
