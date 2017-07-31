# @std/esm

No Babel, no bundles, no problem.<br>
This small, zero dependency, package is all you need to enable
ECMAScript modules in Node 4+ today!

Usage
---

  1. Run `npm i --save @std/esm` in your package or app directory.
  2. Call `require("@std/esm")` before importing ECMAScript modules.

     ##### index.js
     ```js
     require("@std/esm")
     module.exports = require("./main.mjs").default
     ```

Enable ESM in the Node CLI by loading `@std/esm` with [the `-r` option](https://nodejs.org/api/cli.html#cli_r_require_module):

```shell
node -r @std/esm file.mjs
```

Enable ESM in the Node REPL by loading `@std/esm` upon entering:

```shell
$ node
> require("@std/esm")
@std/esm enabled
> import assert from "assert"
> assert.strictEqual(2 + 2, 5)
AssertionError [ERR_ASSERTION]: 4 === 5
    at repl:1:44
    at ContextifyScript.Script.runInThisContext (vm.js:44:33)
  ...
```

Features
---

| | `@std/esm` | ESM in Node 10 |
| --- | --- | --- |
| [Dynamic `import()`](https://github.com/tc39/proposal-dynamic-import) | :white_check_mark: | :white_check_mark: |
| [Live bindings](https://ponyfoo.com/articles/es6-modules-in-depth#bindings-not-values) | :white_check_mark: | :white_check_mark: |
| [Load `.mjs` as ESM](https://github.com/nodejs/node-eps/blob/master/002-es-modules.md#32-determining-if-source-is-an-es-module) | :white_check_mark: | :white_check_mark: |
| Node 4+ support | :white_check_mark: | :x: |

Options
---

Specify ESM loader options using the `"@std/esm"` or `"@std":{"esm":{}}` fields in your package.json.<br>
All options are **off** by default.

<table>
<tr>
  <td colspan="2">
  <pre><code>{
  "@std/esm": {</code></pre>
  </td>
</tr>
<tr>
  <td valign="top"><code>"await":</code></td>
  <td>A boolean for top-level <code>await</code> in the main ES module</td>
</tr>
<tr>
  <td valign="top"><code>"gz":</code></td>
  <td>A boolean for gzipped module support <i>(i.e. <code>.js.gz</code>, <code>.mjs.gz</code>)</i></td>
</tr>
<tr>
  <td valign="top"><code>"esm":</code></td>
  <td>A string ESM mode of <code>"all"</code> or <code>"js"</code> <i>(i.e. <code>.js</code> can be ESM)</i></td>
</tr>
<tr>
  <td valign="top"><code>"cjs":</code></td>
  <td>
    <p>A boolean for CJS features in ESM</p>
    <ul>
    <li><code>__dirname</code> and <code>__filename</code></li>
    <li><code>require</code> in ESM and loading ESM with <code>require</code></li>
    <li><a href="https://ponyfoo.com/articles/es6-modules-in-depth#importing-named-exports">named exports</a> of CJS modules</li>
    <li><a href="http://stackoverflow.com/questions/28955047/why-does-a-module-level-return-statement-work-in-node-js/#28955050">top-level <code>return</code></li>
    </ul>
  </td>
</tr>
<tr>
  <td valign="top"><code>"ext":</code></td>
  <td>
    <p>A boolean for <code>import</code>/<code>export</code> syntax extensions<br>
    <i>(syntax extensions are subject to change every <a href="http://semver.org/">minor release</a>)</i></p>
    <ul>
    <li><a href="https://github.com/tc39/proposal-export-default-from"><code>export v from "mod"</code></a></li>
    <li><a href="https://github.com/tc39/proposal-export-ns-from"><code>export * as ns from "mod"</code></a></li>
    <li>unordered import/export lists</li>
    </ul>
  </td>
</tr>
<tr>
  <td colspan="2">
  <pre><code>  }
}</code></pre>
  </td>
  </tr>
</table>
