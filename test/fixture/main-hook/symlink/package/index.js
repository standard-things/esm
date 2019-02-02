import assert from "assert"
import { log } from "console"
import real from "real"
import symlink from "symlink"

assert.strictEqual(real, symlink)

log("symlink-package:true")
