# @std/esm

This fast, small, zero dependency, package is all you need to enable
ES modules in Node 4+ today!

:book: See the [release post](https://medium.com/web-on-the-edge/es-modules-in-node-today-32cff914e4b)
for all the details.

Getting started
---

  1. Run `npm i --save @std/esm` in your app or package directory.
  2. Call `require("@std/esm")` before importing ES modules.

     ##### index.js
     ```js
     require("@std/esm")
     module.exports = require("./main.mjs").default
     ```

For package authors with sub modules:

```js
// Have "foo" require only "@std/esm".
require("foo")
// Sub modules work!
const bar = require("foo/bar").default
```

Enable ESM in the Node CLI by loading `@std/esm` with the [`-r` option](https://nodejs.org/api/cli.html#cli_r_require_module):

```shell
node -r @std/esm file.mjs
```

Enable ESM in the Node REPL by loading `@std/esm` upon entering:

```shell
$ node
> require("@std/esm")
@std/esm enabled
> import path from "path"
undefined
> path.join("hello", "world")
'hello/world'
```

Standard Features
---

The `@std/esm` loader is as spec-compliant
as possible and follows [Node’s rules](https://github.com/nodejs/node-eps/blob/master/002-es-modules.md).

:point_right: This means, by default, ESM requires the use of the `.mjs`
extension.<br>
:unlock: You can unlock unambiguous `.js` use with the `"esm":"js"` option.

Out of the box `@std/esm` just works, no configuration necessary, and supports:

* [`import`](https://ponyfoo.com/articles/es6-modules-in-depth#import) / [`export`](https://ponyfoo.com/articles/es6-modules-in-depth#export)
* [Dynamic `import()`](https://github.com/tc39/proposal-dynamic-import)
* [Live bindings](https://ponyfoo.com/articles/es6-modules-in-depth#bindings-not-values)
* [Loading `.mjs` files as ESM](https://github.com/nodejs/node-eps/blob/master/002-es-modules.md#32-determining-if-source-is-an-es-module)
* [The file URI scheme](https://en.wikipedia.org/wiki/File_URI_scheme)
* Node 4+ support

Unlockables
---

Unlock extra features with `"@std/esm":options` or
`"@std":{"esm":options}` in your package.json.

*Note: Options are **off** by default and may be specified as either an object or ESM mode string.*

<table>
<tr>
  <td colspan="2">
  <pre><code>{
  "@std/esm": {</code></pre>
  </td>
</tr>
<tr>
  <td valign="top"><code>"await":</code></td>
  <td><p>A boolean for top-level <code>await</code> in the main ES module</p></td>
</tr>
<tr>
  <td valign="top"><code>"gz":</code></td>
  <td>
    <p>A boolean for gzipped module support <i>(i.e. <code>.js.gz</code>, <code>.mjs.gz</code>)</i></p>
    <ul>
    <li>webpack <a href="https://webpack.js.org/loaders/gzip-loader/">gzip-loader</a></li>
    </ul>
  </td>
</tr>
<tr>
  <td valign="top"><code>"esm":</code></td>
  <td>
    <p>A string ESM mode</p>
    <ul>
    <li><code>"mjs"</code> files as ESM <i>(default)</i></li>
    <li><code>"all"</code> files as ESM</li>
    <li><code>"js"</code> files with <code>import</code>/<code>export</code>/<a href="https://github.com/tc39/proposal-modules-pragma"><code>"use module"</code></a> as ESM</li>
    </ul>
  </td>
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
  <td colspan="2">
  <pre><code>  }
}</code></pre>
  </td>
  </tr>
</table>
