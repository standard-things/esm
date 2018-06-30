import { log } from "console"

const actual = JSON.stringify(import.meta)

log("import-meta:" + actual)
