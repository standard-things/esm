import { log } from "console"
import process from "process"

const actual = Reflect.has(process, "mainModule")

log("main-module:" + actual)
