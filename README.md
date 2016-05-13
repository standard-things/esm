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
