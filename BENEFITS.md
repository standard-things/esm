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
