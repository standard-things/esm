import c from "console"
import p from "process"

const actual = Reflect.has(p, "mainModule")

c.log("main-module:" + actual)
