# @std/esm

This fast, small, zero-dependency package is all you need to enable
ES modules in Node 4+ today!

:book: See the [release post](https://medium.com/web-on-the-edge/es-modules-in-node-today-32cff914e4b)
for all the details.

Getting started
---

  1. Run `npm i --save @std/esm` in your app or package directory.
  2. Add `.esm-cache` to your `.gitignore`.
  3. Create the ESM loader to import your main ES module:

     **index.js**
     ```js
     require = require("@std/esm")(module)
     module.exports = require("./main.mjs").default
     ```

     By default, `@std/esm` **only** processes files of packages that opt-in
     with a `@std/esm` options object or `@std/esm` as a dependency, dev
     dependency, or peer dependency in their package.json. However, you can
     enable processing **all** files with specific options by passing an options
     object as the second argument or passing `true` to use the options from
     your package.json.

     ```js
     require = require("@std/esm")(module, optionsOrTrue)
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
> import p from "path"
undefined
> p.join("hello", "world")
'hello/world'
```

*Note: The `"cjs"` and `"gz"` options are [unlocked](#unlockables) in the Node REPL.*

Standard Features
---

The `@std/esm` loader is as spec-compliant
as possible and follows [Node’s rules](https://github.com/nodejs/node-eps/blob/master/002-es-modules.md).

:point_right: This means, by default, ESM requires the use of the `.mjs` file
extension.<br>
:unlock: You can [unlock](#unlockables) ESM with the `.js` file extension using
the `"js"` ESM mode.

Out of the box `@std/esm` just works, no configuration necessary, and supports:

* [`import`](https://ponyfoo.com/articles/es6-modules-in-depth#import) / [`export`](https://ponyfoo.com/articles/es6-modules-in-depth#export)
* [`import.meta`](https://github.com/tc39/proposal-import-meta)
* [Dynamic `import()`](https://github.com/tc39/proposal-dynamic-import)
* [Improved errors](https://mobile.twitter.com/jdalton/status/907741390813016064)
* [Live bindings](https://ponyfoo.com/articles/es6-modules-in-depth#bindings-not-values)
* [Loading `.mjs` files as ESM](https://github.com/nodejs/node-eps/blob/master/002-es-modules.md#32-determining-if-source-is-an-es-module)
* [The file URI scheme](https://en.wikipedia.org/wiki/File_URI_scheme)
* Node 4+ support

Unlockables
---

Unlock extra features with `"@std/esm":options` or `"@std":{"esm":options}`
in your package.json.

*Note: All options are **off** by default and may be specified as either an object or ESM mode string.*

<table>
<tr>
  <td colspan="2">
    <pre><code>{
  "@std/esm": {</code></pre>
  </td>
</tr>
<tr>
  <td valign="top"><code>"esm":</code></td>
  <td>
    <p>A string ESM mode:</p>
    <ul>
    <li><code>"mjs"</code> files as ESM <i>(default)</i></li>
    <li><code>"all"</code> files as ESM</li>
    <li><code>"js"</code> and other files with <code>import</code>, <code>export</code>, or <a href="https://github.com/tc39/proposal-modules-pragma"><code>"use module"</code></a> as ESM</li>
    </ul>
  </td>
</tr>
<tr>
  <td valign="top"><code>"cjs":</code></td>
  <td>
    <p>A boolean for CJS features in ESM:</p>
    <ul>
    <li><code>__dirname</code> and <code>__filename</code></li>
    <li><code>require</code> in ESM and loading ESM with <code>require</code></li>
    <li><a href="https://ponyfoo.com/articles/es6-modules-in-depth#importing-named-exports">Importing named exports</a> of CJS modules</li>
    <li><a href="http://stackoverflow.com/questions/28955047/why-does-a-module-level-return-statement-work-in-node-js/#28955050">Top-level <code>return</code></a></li>
    </ul>
  </td>
</tr>
<tr>
  <td valign="top"><code>"await":</code></td>
  <td><p>A boolean for top-level <code>await</code> in the main ES module.</p></td>
</tr>
<tr>
  <td valign="top"><code>"gz":</code></td>
  <td>
    <p>A boolean for gzipped module support <i>(i.e. <code>.js.gz</code>, <code>.mjs.gz</code>).</i></p>
    <p><i>Note: Don’t forget the webpack <a href="https://webpack.js.org/loaders/gzip-loader/">gzip-loader</a>.</i></p>
  </td>
</tr>
<tr>
  <td colspan="2">
    <pre><code>  }
}</code></pre>
  </td>
</tr>
</table>

DevOpts
---

<table>
<tr>
  <td colspan="2">
    <pre><code>{
  "@std/esm": {</code></pre>
  </td>
</tr>
<tr>
  <td valign="top"><code>"debug":</code></td>
  <td><p>A boolean for unmasking stack traces.</p></td>
</tr>
<tr>
  <td valign="top"><code>"sourceMap":</code></td>
  <td>
    <p>A boolean for enabling inline source maps.</p>
    <p><i>Note: Automatically enabled using the Node CLI
    <a href="https://nodejs.org/en/docs/inspector/"><code>--inspect</code> option</a>.</i></p>
  </td>
</tr>
<tr>
  <td valign="top"><code>"warnings":</code></td>
  <td>
    <p>A boolean for enabling parse and runtime warnings.</p>
    <p><i>Note: The default value is <code>process.env.NODE_ENV !== "production"</code>.</i></p>
  </td>
</tr>
<tr>
  <td colspan="2">
    <pre><code>  }
}</code></pre>
  </td>
</tr>
</table>
