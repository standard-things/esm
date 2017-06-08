# @std/esm

Under Construction
---

Please watch your step. This project is currently an unreleased work in progress. 🚧

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

Features
---

<table>
<tr><th></td><th><code>@std/esm</code></td><th>ESM in Node 10</th></tr>
<tr><td><a href="https://github.com/tc39/proposal-dynamic-import">Dynamic <code>import()</code></a></td><td>✅</td><td>✅</td></tr>
<tr><td><a href="https://ponyfoo.com/articles/es6-modules-in-depth#bindings-not-values">Live bindings</a></td><td>✅</td><td>✅</td></tr>
<tr><td>Loads <code>.mjs</code> as ESM</td><td>✅</td><td>✅</td></tr>
<tr><td>Loads <code>.js</code> as ESM</td><td>✅</td><td>❌</td></tr>
<tr><td>Loads gzipped modules <i>(e.g. <code>.js.gz</code>, <code>.mjs.gz</code>)</i></td><td>✅</td><td>❌</td></tr>
<tr><td>Node 4+ support</td><td>✅</td><td>❌</td></tr>
<tr><td>Top-level <code>await</code> for main ES module</td><td>✅ *</td><td>❌</td></tr>
<tr><td>Unordered specifiers <code>import * as ns, v, {a,b} from "mod"</code></td><td>✅ *</td><td>❌</td></tr>
<tr><td><a href="https://ponyfoo.com/articles/es6-modules-in-depth#importing-named-exports"><code>import {a,b} from "cjs"</code></a></td><td>✅ *</td><td>❌</td></tr>
<tr><td><a href="https://github.com/leebyron/ecmascript-export-ns-from"><code>export * as ns from "mod"</code></a></td><td>✅ *</td><td>❌</td></tr>
<tr><td><a href="https://github.com/leebyron/ecmascript-export-default-from"><code>export v from "mod"</code></a></td><td>✅ *</td><td>❌</td></tr>
<tr><td><a href="http://stackoverflow.com/questions/28955047/why-does-a-module-level-return-statement-work-in-node-js/#28955050">Top-level <code>return</code></a> in ESM</td><td>✅ **</td><td>❌</td></tr>
<tr><td><code>__dirname</code> in ESM</td><td>✅ **</td><td>❌</td></tr>
<tr><td><code>__filename</code> in ESM</td><td>✅ **</td><td>❌</td></tr>
<tr><td><code>require</code> in ESM</td><td>✅ **</td><td>❌</td></tr>
<tr><td>Loads ESM with <code>require</code> from CJS</td><td>✅ **</td><td>❌</td></tr>
</table>

<p>
<i>* ESM expansions</i><br>
<i>** Carryover from CJS</i>
</p>
