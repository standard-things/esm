import { log } from "console"
import process from "process"

const actual = "mainModule" in process

log("main-module:" + actual)
