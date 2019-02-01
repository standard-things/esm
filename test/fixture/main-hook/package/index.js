import assert from "assert"
import { log } from "console"
import { Foo } from "./module-1"
import { Bar } from "./module-2"

assert.strictEqual(Foo, Bar)

log("package:true")
