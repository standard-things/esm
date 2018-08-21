// @flow
import { test } from "./test"

const msg: string = test()

process.stdout.write(msg)
