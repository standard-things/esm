# babel-plugin-transform-es2015-modules-reify

This plugin transforms [ES2015 module
syntax](http://www.2ality.com/2014/09/es6-modules-final.html) to code that
uses the [Reify](https://github.com/benjamn/reify) runtime API.

Benefits of this transform include:

* Imported variables are never renamed or turned into property lookups, so
  you can inspect your imports easily in the debugger.

* [Nested `import`
  declarations](https://github.com/benjamn/reify/blob/master/WHY_NEST_IMPORTS.md)
  are supported.

* [Live bindings](http://www.2ality.com/2015/07/es6-module-exports.html)
  are *simulated* by automatically updating imported variables whenever
  new values are exported.

## How it works

Please see the Reify
[`README.md`](https://github.com/benjamn/reify#how-it-works) file for more
details about how the runtime API works.

## Installing the plugin

```sh
npm install --save-dev babel-plugin-transform-es2015-modules-reify
npm install --save reify
```

## Installing the runtime

**Node**

In Node.js, you can install the `Module.prototype.{import,export}` API by
simply importing the
[`reify/node/runtime`](https://github.com/benjamn/reify/blob/master/node/runtime.js)
module:

```js
require("reify/node/runtime");
```

**Other module systems**

Using Reify with other CommonJS module systems is possible, but not always
easy. In order to work with Reify, the module system must

* Have a `Module.prototype` object that all CommonJS `module` objects
  inherit from. This is true for Node and Meteor, but not for Webpack or
  Browserify.

* Implement a `Module.prototype.resolve(id)` method that returns the same
  absolute module identifier string as `require.resolve(id)`.

* Call `module.runModuleSetters()` whenever a module finishes evaluating,
  even if it was not compiled by Reify.

If your module system meets these requirements, then you can install the
Reify runtime by calling

```js
require("reify/lib/runtime").enable(module.constructor)
```

where `module.constructor` is the `Module` constructor function whose
`Module.prototype` object supports the runtime API.

You can see how the Node runtime meets these requirements
[here](https://github.com/benjamn/reify/blob/master/node/runtime.js).

You can see how Meteor meets these requirements via the
[`install`](https://github.com/benjamn/install) npm package
[here](https://github.com/benjamn/install/blob/4cb438f93502f58b3b592eec55c0fbdd47499875/install.js#L77-L79)
and
[here](https://github.com/benjamn/install/blob/4cb438f93502f58b3b592eec55c0fbdd47499875/install.js#L193).

## Usage

### Via `.babelrc` (Recommended)

**.babelrc**

```js
{
  "plugins": ["transform-es2015-modules-reify"]
}
```

### Via CLI

```sh
babel --plugins transform-es2015-modules-commonjs script.js
```

### Via Node API

```javascript
require("babel-core").transform("code", {
  plugins: ["transform-es2015-modules-commonjs"]
});
```
