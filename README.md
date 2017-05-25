# @std/esm

Usage
---

  1. Run `npm i --save @std/esm` in your package or app directory.
  2. Call `require("@std/esm")` before importing ECMAScript modules.

Enable ESM in the Node REPL by loading `@std/esm` upon entering:

```shell
$ node
> require("@std/esm")
{}
> import { strictEqual } from "assert"
> strictEqual(2 + 2, 5)
AssertionError: 4 === 5
    at repl:1:1
    at REPLServer.defaultEval (repl.js:272:27)
  ...
```
