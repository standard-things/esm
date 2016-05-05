# re•i•fy <sub>_verb, formal_</sub> [![Build Status](https://travis-ci.org/benjamn/reify.svg?branch=master)](https://travis-ci.org/benjamn/reify)

1. to make (something abstract) more concrete or real.<br>
   _"these instincts are, in humans, reified as verbal constructs"_

**Enable ECMAScript 2015 modules in Node today. No caveats. Full stop.**

Well, ok, one caveat: this package isn't ready for production use just yet. As of this writing, the repository is all of two days old! Watch this space to find out when `reify` is safe to use.

Installation
---
Run `npm install --save reify` in your package or app directory (wherever your `package.json` lives).

Usage
---
Call `require("reify")` before importing modules that contain `import` and `export` statements.

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
