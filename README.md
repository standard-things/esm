# esm

A fast, production ready, zero-dependency ES module loader for Node 6+!

See the release [post](https://medium.com/web-on-the-edge/tomorrows-es-modules-today-c53d29ac448c)
:book: and [video](https://www.youtube.com/watch?v=JcZ-FzfDq8A#t=5) :movie_camera:
for all the details.

Install
---

Run `npx create-esm` or `yarn create esm`.

:bulb: Use the `-y` flag to answer “yes” to all prompts.

Getting started
---

There are two ways to enable `esm`.

1. Enable `esm` for packages:

    **index.js**
    ```js
    // Set options as a parameter, environment variable, or rc file.
    require = require("esm")(module/*, options*/)
    module.exports = require("./main.js")
    ```
    **main.js**
    ```js
    // Put ESM code here.
    export {}
    ```
    :bulb: This is automagically done by [`create-esm`](https://github.com/standard-things/create-esm).

2. Enable `esm` for local runs:

    ```shell
    node -r esm main.js
    ```
    :bulb: Omit the filename to enable `esm` in the REPL.

Features
---

The `esm` loader bridges the ESM of [today](https://babeljs.io/) to the
ESM of [tomorrow](https://github.com/nodejs/modules).

:clap: By default, :100: percent CJS interoperability is enabled so you can get stuff done fast.<br>
:lock: `.mjs` files are limited to basic functionality without support for `esm` options.

Out of the box `esm` just works, no configuration necessary, and supports:

* [`import`](https://ponyfoo.com/articles/es6-modules-in-depth#import) / [`export`](https://ponyfoo.com/articles/es6-modules-in-depth#export)
* [`import.meta`](https://github.com/tc39/proposal-import-meta)
* [Dynamic `import`](https://github.com/tc39/proposal-dynamic-import)
* [Improved errors](https://github.com/standard-things/esm/wiki/improved-errors)
* [Live bindings](https://ponyfoo.com/articles/es6-modules-in-depth#bindings-not-values)
* [Loading `.mjs` files as ESM](https://github.com/nodejs/node-eps/blob/master/002-es-modules.md#32-determining-if-source-is-an-es-module)
* [The file URI scheme](https://en.wikipedia.org/wiki/File_URI_scheme)
* Node [`--eval`](https://nodejs.org/api/cli.html#cli_e_eval_script) and [`--print`](https://nodejs.org/api/cli.html#cli_p_print_script) flags

Options
---

Specify options with one of the following:

* The `"esm"` field in your `package.json`
* [JSON6](https://github.com/d3x0r/json6) in an `.esmrc` or `.esmrc.json` file
* JSON6 or file path in the `ESM_OPTIONS` environment variable
* CJS/ESM in an `.esmrc.js` or `.esmrc.mjs` file

<table>
<tr>
  <td colspan="2"><code>{</code></td>
</tr>
<tr>
  <td valign="top"><code>"mode":</code></td>
  <td>
    <p>A string mode:</p>
    <ul>
      <li><code>"auto"</code> detect files with <code>import</code>, <code>import.meta</code>, <code>export</code>,<br><a href="https://github.com/tc39/proposal-modules-pragma"><code>"use module"</code></a>, or <code>.mjs</code> as ESM</li>
      <li><code>"all"</code> script files are treated as ESM</li>
      <li><code>"strict"</code> to treat <strong>only</strong> <code>.mjs</code> files as ESM</li>
    </ul>
  </td>
</tr>
<tr>
  <td valign="top"><code>"cjs":</code></td>
  <td>
    <p>A boolean or object for toggling CJS features in ESM.</p>
    <details>
      <summary>Features</summary>
      <table>
      <tr>
        <td colspan="2"><code>{</code></td>
      </tr>
      <tr>
        <td valign="top"><code>"cache":</code></td>
        <td>
          <p>A boolean for storing ES modules in <code>require.cache</code>.</p>
        </td>
      </tr>
      <tr>
        <td valign="top"><code>"extensions":</code></td>
        <td>
          <p>A boolean for respecting <code>require.extensions</code> in ESM.</p>
        </td>
      </tr>
      <tr>
        <td valign="top"><code>"interop":</code></td>
        <td>
          <p>A boolean for <code>__esModule</code> interoperability.</p>
        </td>
      </tr>
      <tr>
        <td valign="top"><code>"namedExports":</code></td>
        <td>
          <p>A boolean for <a href="https://ponyfoo.com/articles/es6-modules-in-depth#importing-named-exports">importing named exports</a> of CJS modules.</p>
        </td>
      </tr>
      <tr>
        <td valign="top"><code>"paths":</code></td>
        <td>
          <p>A boolean for following CJS <a href="https://github.com/nodejs/node-eps/blob/master/002-es-modules.md#432-removal-of-non-local-dependencies">path rules</a> in ESM.</p>
        </td>
      </tr>
      <tr>
        <td valign="top"><code>"vars":</code></td>
        <td>
          <p>A boolean for <code>__dirname</code>, <code>__filename</code>, and <code>require</code> in ESM.</p>
        </td>
      </tr>
      <tr>
        <td colspan="2"><code>}</code></td>
      </tr>
      </table>
    </details>
  </td>
</tr>
<tr>
  <td valign="top"><code>"await":</code></td>
  <td>
    <p>A boolean for top-level <a href="https://node.green/#ES2017-features-async-functions-await"><code>await</code></a> in modules <a href="https://github.com/MylesBorins/proposal-top-level-await#variant-c-top-level-await-can-only-be-used-in-modules-without-exports">without ESM exports</a>.</p>
  </td>
</tr>
<tr>
  <td colspan="2"><code>}</code></td>
</tr>
</table>

DevOpts
---

<table>
<tr>
  <td colspan="2"><code>{</code></td>
</tr>
<tr>
  <td valign="top"><code>"cache":</code></td>
  <td>
    <p>A boolean for toggling cache creation or string path of the cache directory.</p>
  </td>
</tr>
<tr>
  <td valign="top"><code>"debug":</code></td>
  <td>
    <p>A boolean for unmasking stack traces.</p>
  </td>
</tr>
<tr>
  <td valign="top"><code>"sourceMap":</code></td>
  <td>
    <p>A boolean for including inline source maps.</p>
  </td>
</tr>
<tr>
  <td valign="top"><code>"warnings":</code></td>
  <td>
    <p>A boolean for logging development parse and runtime warnings.</p>
  </td>
</tr>
<tr>
  <td colspan="2"><code>}</code></td>
</tr>
</table>

Tips
---
* Load `esm` before
  [`@babel/register`](https://github.com/babel/babel/tree/master/packages/babel-register)
* Load `esm` with the “require” option of
  [`ava`](https://github.com/avajs/ava#options),
  [`mocha`](https://mochajs.org/#-r---require-module-name),
  [`nyc`](https://github.com/istanbuljs/nyc#require-additional-modules),
  [`qunit`](https://github.com/qunitjs/qunit/releases/tag/2.6.0),
  [`tape`](https://github.com/substack/tape#preloading-modules), and
  [`webpack`](https://webpack.js.org/api/cli/#config-options)
* Load `esm` with the `--node-arg=-r --node-arg=esm` option of
  [`node-tap`](http://www.node-tap.org/cli/)
* Load `esm` with the `--node-args="-r esm"` option of
  [`pm2`](http://pm2.keymetrics.io/docs/usage/quick-start/#options)
* Load `esm` with [`wallaby.js`](https://wallabyjs.com/docs/integration/node.html#es-modules)
* Use `esm` to load [`jasmine`](https://jasmine.github.io/setup/nodejs.html#a-simple-example-using-the-library)
