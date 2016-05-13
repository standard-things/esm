# re•i•fy <sub>_verb, transitive_</sub> &nbsp; [![Build Status](https://travis-ci.org/benjamn/reify.svg?branch=master)](https://travis-ci.org/benjamn/reify)

**re•i•fied** <sub>past</sub> &nbsp; **re•i•fies** <sub>present</sub> &nbsp; **re•i•fy•ing** <sub>participle</sub>

1. to make (something abstract) more concrete or real<br>
   _"these instincts are, in humans, reified as verbal constructs"_
2. to regard or treat (an idea, concept, etc.) as if having material existence
3. **to enable [ECMAScript 2015 modules](http://www.2ality.com/2014/09/es6-modules-final.html) in *any* version of [Node.js](https://nodejs.org)**

**re•i•fi•ca•tion** <sub>noun</sub> &nbsp; **re•i•fi•er** <sub>noun</sub>

Usage
---

1. Run `npm install --save reify` in your package or app directory. The
   `--save` is important because reification only applies to modules in
   packages that explicitly depend on the `reify` package.
2. Call `require("reify")` before importing modules that contain `import`
   and `export` statements.

You can also easily `reify` the Node REPL:

```sh
% node
> require("reify/repl")
{}
> import { strictEqual } from "assert"
> strictEqual(2 + 2, 5)
AssertionError: 4 === 5
    at repl:1:1
    at REPLServer.defaultEval (repl.js:272:27)
  ...
```

Benefits
---
* Dead-simple installation and setup: `npm install --save reify`, `require("reify")`
* Works with every version of Node.
* Put `import` and `export` statements anywhere you like.
  * They're just statements.
  * If you have a philosophical preference for restricting them to the top-level, there are plenty of ways to enforce that.
  * This library doesn't limit you either way.
* Imported symbols are just normal variables.
  * Debuggers and dev tools display the symbols as you wrote them, unmangled by a transpiler.
  * Not having to rename variables references leads to much faster compilation.
  * Variables are confined to the scope where they were imported.
  * `import` statements work in the Node REPL.
* Any existing module or package can be imported.
  * Babel's `interopRequire{Default,Wildcard}` logic is captured by `Module.prototype.getExportByName`.
* Does not interfere with existing `require.extensions` hooks.
* Much simpler transform implementation as compared with other ECMASCript module compilers.
  * `import` statements become calls to `module.import(id, setters)`
  * `export` statements become assignments to the `exports` object.
  * The compiler doesn't have to parse the entire file to find `import` and `export` statements.
* Line numbers are strictly preserved.
  * No hoisting of `import` statements.
  * All `import` and `export` statements are compiled in-place.
* No need for `Object.defineProperty`-style getters to support `export * from "..."`.
* The `module.import(id, setters)` API is human-writable, too, if you want to implement custom update logic.
* Generated code is statically analyzable, since the `exports` object is not exposed.

Drawbacks
---
* Only works with CommonJS module systems that are very similar to Node's module system.
* Adds some overhead to module evaluation.
* Affects every yet-to-be required module in the Node process.
* Not a general solution for other kinds of JavaScript compilation.
* Not a solution for asynchronous module loading, yet.
