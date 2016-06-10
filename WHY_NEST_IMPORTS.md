# The case for nested `import` declarations

## Context

Since the publication of the [ECMASCript 2015
standard](http://www.ecma-international.org/ecma-262/6.0/), which
introduced [new syntax](http://www.2ality.com/2014/09/es6-modules-final.html)
for statically analyzable `import` and `export` declarations, the JavaScript
community has fallen under the impression that it would be unwise to let
these declarations appear anywhere except at the *top level* of a module. In
particular, this restriction would forbid nesting `import` declarations in
conditional blocks or other nested scopes.

Because I respect the intelligence and free opinions of those who support
this restriction, I have written this document with three goals in mind:

  1. to provide real-world examples of the problems that nested `import`
     declarations can solve, [#](#real-world-examples)
  2. to entertain and carefully critique every reason one might have for
     supporting the restriction, [#](#objections-and-critiques) and
  3. to show how nested `import` declarations can be implemented correctly
     and efficiently in all versions of Node and most other CommonJS
     module systems, today. [#](#but-how)

**Note:** this document does not take a position on the usefulness or
advisability of nested `export` declarations. I have never personally
encountered a scenario that called for putting `export` declarations inside
conditional blocks or nested function scopes, and I appreciate the concern
that doing so would make it difficult or impossible to know exactly which
symbols the module provides.

### Who am I?

I, [Ben](https://twitter.com/benjamn) [Newman](https://github.com/benjamn), am

  * the tech lead for the open-source [Meteor](https://github.com/meteor/meteor) project,
  * an off-and-on delegate to [TC39](https://github.com/tc39/), the standards committee that publishes the [ECMAScript specification](http://www.ecma-international.org/ecma-262/6.0), on behalf of Meteor and previously Facebook,
  * the author of a number of open-source JavaScript libraries, such as [Recast](https://github.com/benjamn/recast) and [Regenerator](https://github.com/facebook/regenerator),
  * the implementor of multiple JavaScript module systems, including those used by [Quora](https://www.quora.com/) and [Meteor](http://info.meteor.com/blog/announcing-meteor-1.3), and
  * someone who believes that native module syntax is the most important new feature of ECMAScript 2015, as I argued in this [presentation](https://www.youtube.com/watch?v=-zch_YmKfa0) at last year's [EmpireNode conference](http://2015.empirenode.org).

I hope the above qualifications convince you that I care as much as anyone
about ECMAScript modules, and that I have thought about them deeply enough
to have an informed opinion.

### What's so great about ECMAScript module syntax?

Aren't CommonJS `require` and `exports` good enough?

If you're not yet convinced of the importance of `import` and `export`,
please take the time to read my [EmpireNode
slides](http://benjamn.github.io/empirenode-2015). The **tl;dr** is that
ES modules incorporate most of the good ideas from CommonJS, while fixing
some of its problems. In particular, ES modules

  * allow dependency cycles (like CommonJS), but handle them more gracefully with [*live bindings*](http://www.2ality.com/2015/07/es6-module-exports.html),
  * can be easily understood with static (i.e., compile-time) analysis, enabling powerful new [tools](http://rollupjs.org/), and
  * put an end to the long and polarizing debate over competing JavaScript module systems.

## Real-world examples

### Isolated scopes

Consider writing a simple BDD-style unit test that involves importing a
symbol called `check` from three different modules:

```js
describe("fancy feature #5", () => {
  import { strictEqual } from "assert";

  it("should work on the client", () => {
    import { check } from "./client.js";
    strictEqual(check(), "client ok");
  });

  it("should work on the client", () => {
    import { check } from "./server.js";
    strictEqual(check(), "server ok");
  });

  it("should work on both client and server", () => {
    import { check } from "./both.js";
    strictEqual(check(), "both ok");
  });
});
```

If `import` declarations could not appear in nested scopes, you would have
to write this code differently:

```js
import { strictEqual } from "assert";
import { check as checkClient } from "./client.js";
import { check as checkServer } from "./server.js";
import { check as checkBoth } from "./both.js";

describe("fancy feature #5", () => {
  it("should work on the client", () => {
    strictEqual(checkClient(), "client ok");
  });

  it("should work on the client", () => {
    strictEqual(checkServer(), "server ok");
  });

  it("should work on both client and server", () => {
    strictEqual(checkBoth(), "both ok");
  });
});
```

This manual renaming is certainly annoying, but that's not the worst of
it. Since the `import` declarations are evaluated before the tests are
defined, any exceptions thrown by importing the modules will prevent your
tests from running at all! Compare this behavior to that of the original
code, where each test captures any and all exceptions resulting from its
own particular `import` declaration and `strictEqual(check(), ...)` call.

### Lazy evaluation

As the previous example suggests, putting all your `import` declarations
at the top level of your modules means you pay the performance cost of
evaluating all your modules at startup time, even if they are not used
until much later&mdash;or in some cases never used at all!

If you have the ability to nest `import` declarations in the immediate scope
where the imported symbols will be used, then you can take full advantage
of your application's specific needs and there is nothing to stop you from
front-loading your imports if that makes sense for your application.

Eager evaluation of the entire dependency tree is fine for long-running
applications like servers, but not so great for short-lived, multi-purpose
utilities like command-line tools, or client-side applications that must
evaluate modules while the user waits. For example, the [WebTorrent
Desktop app](https://webtorrent.io/) was able to reduce startup time
dramatically [by deferring `require`
calls](https://mobile.twitter.com/WebTorrentApp/status/737890973733244928). This
optimization would not have been possible if they could only use `import`
declarations at the top level.

To put it in even stronger terms, if we do not allow ourselves to nest
`import` declarations, then serious applications will never be able to
stop using the CommonJS `require` function, and JavaScript modules will
remain an awkward hybrid of modern and legacy styles.

Is that a future we can tolerate?

### Colocation of `import` declarations with consuming code

When you delete code that contains a nested `import` declaration, you
don't have to scroll up to the top of the file and search through a
laundry list of other `import` declarations, then search through the rest
of the file for any other references to the imported symbols. The scope of
the nested `import` declaration is obvious, so it's easy to tell when it's
safe to delete.

### Optimistic imports

Perhaps you would like to use a module if it is available, but it's hardly the end of the world if it's not:

```js
try {
  import esc from "enhanced-super-console";
  console = esc;
} catch (e) {
  if (e.code !== "MODULE_NOT_FOUND") {
    // Let unexpected exceptions propagate.
    throw e;
  }
  // That's ok, we'll just stick to the usual implementations of
  // console.log, .error, .trace, etc.
}
```

Without the ability to nest `import` declarations inside `try`-`catch`
blocks, there would be no way to achieve this progressive enhancement of
the `console` object.

### "Isomorphic" code

### Dead code elimination

### Automatic code splitting

In order for nested `import` declarations to work, the runtime module
system must ensure that the source module is available at the time of the
`import`. In Node, where all modules are immediately available on disk,
this guarantee has never posed much of a problem. In contexts where
modules must be fetched from a server, and fetching all modules would be
prohibitively expensive, some sort of bundling step becomes necessary.

Thankfully, because ECMAScript `import` declarations always have
statically analyzable source identifier strings, bundling tools have a
much easier time understanding `import` declarations than they do
understanding CommonJS `require(id)` calls.

One simplistic but effective strategy for bundling an app with nested
`import` declarations is to imagine (for lack of any better idea) that all
`import` declarations in the app might be evaluated during startup, which
means every imported module must be included in a single monolithic bundle
that loads before the app runs.

This simple strategy will always work, but it may not be obvious how it
could ever be improved. After all, if you have an `import` declaration
nested inside an ordinary function, that doesn't really help you know when
the `import` declaration will be evaluated, unless you happen to have
special insight into when the function might be called.

In fact, unless we introduce some sort of asynchronous `import`
declaration syntax or [alternate runtime
API](https://whatwg.github.io/loader), the monolithic bundling approach
seems unavoidable.

**Fortunately ECMAScript 2016 introduces a powerful new language feature
that just happens to allow for more efficient bundle splitting: [`async`
functions](https://tc39.github.io/ecmascript-asyncawait/).**

The key difference between an `async` function and a normal function is
that an `async` function always returns a `Promise`, so callers of the
`async` function must be prepared to tolerate a delay before the function
produces its result. This delay is exactly what the runtime module system
needs to guarantee that any modules imported by the `async` function are
available (but not yet evaluated) before the `async` function begins
execution.

This tiny window of freedom allows smart bundling tools to produce
multiple smaller bundles. Specifically, any modules that are imported only
by `async` functions can be split into a separate bundle, and that bundle
can be loaded whenever is convenient, as long as the corresponding `async`
function can trust that the bundle has loaded. Waiting to load the bundle
until the moment the `async` function is called is one option, but
probably not the best option, unless the bundle is very rarely used.
Instead, the `async` bundle should be loaded as soon as the app is idle,
some time after startup, so that in most cases the `async` function will
not actually have to wait for the bundle to load.

For example, suppose you have an app with a "Settings" panel that most
users do not use frequently, and that never needs to be loaded when the
app first loads (unless the user goes directly to the `/settings` URL).
You will probably have a Router that dispatches actions based on changes
to the URL:

```js
import { Router } from "example-router";

Router.route({
  "/"(params) {
    import { MainApp } from "./app";
    MainApp.render(params);
  },

  "/settings"(params) {
    import { Settings } from "./settings";
    Settings.render(params);
  }
});
```

As written, this code would force the bundler to include `example-router`,
`./app`, `./settings`, and all their dependencies in a single monolithic
bundle. However, if we imagine that the router supports `async` handler
functions, then a small tweak opens up exciting new possibilities:

```js
import { Router } from "example-router";

Router.route({
  async "/"(params) {
    import { MainApp } from "./app";
    MainApp.render(params);
  },

  async "/settings"(params) {
    import { Settings } from "./settings";
    Settings.render(params);

    // Since we're in an async function, it's easy to consume any
    // Promise-based API as well:
    const log = await System.import("logger-v" + Settings.version);
    log("rendered /settings");
  },
});
```

Now, because the `/` and `/settings` handler functions are `async`, a
smart bundler has the freedom to produce one bundle for `example-router`
(and all its dependencies), another bundle for all the dependencies of the
`/` handler not already included in the first bundle, and another bundle
for the dependencies of the `/settings` handler not already included in
the other two bundles.

I say "freedom" because the bundler has room to optimize: perhaps you know
that the `/` route is likely to be loaded first, and so it makes sense for
the bundler to put all the dependencies of `./app` into the initial bundle
(which also includes `example-router`). Perhaps `./app` and `./settings`
share some dependencies, so it makes sense to have a fourth bundle loaded
by both handlers in addition to their own unique dependencies. Perhaps the
bundler decides it makes sense for every module to be loaded individually!

All of these alternatives are possible, and it's up to the bundling tool
to make the right decisions (perhaps with some input from the developer).
The essential insight is that the developer should use `async` functions
wherever asynchronous delays are acceptable, so that the bundler has room
to deliver modules as efficiently as it can.

## Objections and critiques

### "Nested `import` declarations prevent static analysis"

ECMASCript 2015 module syntax supports two important kinds of static analysis:

1. Detecting attempts to import symbols from modules that do not export
   those symbols.
2. Detecting when an exported symbol is never imported, so the
   corresponding implementation can be eliminated.

ES2015 module syntax makes these analyses possible by forcing symbols to
be named individually as part of the `import` or `export` declaration,
rather than exposing the entire `exports` object, and by enforcing that
module identifiers are always string literals, so there is no equivalent
of the CommonJS `require(dynamicVariable)` confusion.

CommonJS happily exposes the entire `exports` object, which can then leak
into highly dynamic code that is impossible for static tools to
understand; and it does not enforce that module identifiers are always
string literals, which means it's usually impossible to make sense of
`require(dynamicVariable)` calls.

**Nested `import` declarations pose no threat to either of these static
  analyses.**

Why? Nested `import` declarations still have string literal source
identifiers, and still require symbols to be named individually. The only
new behavior is that some nested `import` declarations might not be
evaluated at runtime. Because that question is difficult to answer at
compile time, we have to assume the worst, and imagine that all `import`
declarations always execute. In other words, the potential use of an
imported symbol is no different from the 100%-certain use of an imported
symbol, as far as static analysis is concerned.

Think about it: if you couldn't nest `import` declarations, you would have
to hoist them to the top level of the module anyway, where they would be
guaranteed to execute, even if it turns out the module is not needed at
runtime. Static analysis only cares&mdash;and only *can* care&mdash;about
the set of symbols that might possibly be imported by one module from
another module, and that set is not affected by the placement of `import`
declarations.

Finally, languages that are much more concerned with static analysis than
JavaScript, such as Scala, somehow [get away with nesting
imports](https://www.safaribooksonline.com/library/view/scala-cookbook/9781449340292/ch07s07.html).

### "The specification forbids nested `import` declarations"

There is definitely some merit to this argument, but I want to spend a
moment understanding exactly what it would mean to change the spec, if
that's what we decide to do.

This argument is based on a single
[fragment](http://www.ecma-international.org/ecma-262/6.0/index.html#sec-modules)
of formal grammar that allows the non-terminal *ModuleItem* symbol to
produce an *ImportDeclaration*, an *ExportDeclaration*, or a
*StatementListItem*:

&nbsp;&nbsp;&nbsp;&nbsp; *Module* :<br>
&nbsp;&nbsp;&nbsp;&nbsp; &nbsp;&nbsp;&nbsp;&nbsp; *ModuleBody* <sub>opt</sub><br>
&nbsp;&nbsp;&nbsp;&nbsp; *ModuleBody* :<br>
&nbsp;&nbsp;&nbsp;&nbsp; &nbsp;&nbsp;&nbsp;&nbsp; *ModuleItemList*<br>
&nbsp;&nbsp;&nbsp;&nbsp; *ModuleItemList* :<br>
&nbsp;&nbsp;&nbsp;&nbsp; &nbsp;&nbsp;&nbsp;&nbsp; *ModuleItem*<br>
&nbsp;&nbsp;&nbsp;&nbsp; &nbsp;&nbsp;&nbsp;&nbsp; *ModuleItemList* *ModuleItem*<br>
&nbsp;&nbsp;&nbsp;&nbsp; *ModuleItem* :<br>
&nbsp;&nbsp;&nbsp;&nbsp; &nbsp;&nbsp;&nbsp;&nbsp; *ImportDeclaration*<br>
&nbsp;&nbsp;&nbsp;&nbsp; &nbsp;&nbsp;&nbsp;&nbsp; *ExportDeclaration*<br>
&nbsp;&nbsp;&nbsp;&nbsp; &nbsp;&nbsp;&nbsp;&nbsp; *StatementListItem*

The astute specification reader will note that *StatementListItem* can
never produce another *ImportDeclaration*, which establishes the
restriction that we've been talking about.

Now, the ECMAScript specification is a highly technical document, and
significant implications are not always accompanied by extensive verbal
justifications. However, it is worth emphasizing that this snippet of
grammar is the *only* indication in the entire spec that `import`
declarations should be restricted to the top level of modules.

In other words, if we were to relax the rules for where `import`
declarations can appear, this part of the grammar would absolutely have to
be updated, but it would be a very easy change to make, since nothing else
in the spec assumes that `import` declarations can only appear at the top
level.

### "Nested `import` declarations are difficult to transpile"

While it would be easy to change the ECMAScript specification to allow
nested `import` declarations, and it would be relatively straightforward
for native implementations to support them, it might not be so easy for
existing *transpilers* to handle arbitrarily nested `import` declarations.

The three most prevalent modules transforms currently in use are Babel's
[CommonJS](https://www.npmjs.com/package/babel-plugin-transform-es2015-modules-commonjs)
and
[SystemJS](https://www.npmjs.com/package/babel-plugin-transform-es2015-modules-systemjs)
transforms, and
[TypeScript](https://www.typescriptlang.org/docs/handbook/modules.html).

Babel's CommonJS transform achieves [live
binding](http://www.2ality.com/2015/07/es6-module-exports.html) by saving
a reference to the `exports` object of the imported module, then rewriting
all references to the imported symbols as property lookups against that
object:

```js
import { a, b } from "./asdf";
import { c } from "./zxcv";
console.log(a + b + c);
```
becomes:
```js
var _asdf = require("./asdf");
var _zxcv = require("./zxcv");
console.log(_asdf.a + _asdf.b + _zxcv.c);
```

Although debugging can be tricky because of the renaming, this approach
works well enough that I decided to use it when implementing the Meteor
1.3 module system, and I don't regret that choice.

Purely for [performance
reasons](https://phabricator.babeljs.io/T1760#53350), it's convenient if
the rewriting uses a single globally-defined map, rather than a map for
each scope. So it would not be impossible for Babel to support nested
`import` declarations, just a bit slower. Instead, the Babel compiler
throws an exception when it encounters a nested `import` declaration.

TypeScript only officially supports top-level `import` declarations. I
don't fully understand the implementation details, but I find it somewhat
disturbing that nested `import` declarations seem to be tolerated without
compilation errors, even though they are totally broken at runtime:

```js
import a from "./asdf";
function foo() {
  import x from "./zxcv";
  return x;
}
console.log(a + foo());
```

becomes:

```js
define(["require", "exports", "./asdf"], function (require, exports, asdf_1) {
    "use strict";
    function foo() {
        return zxcv_1.default;
    }
    console.log(asdf_1.default + foo());
});
```

Where does that `zxcv_1` variable come from? I'm afraid the answer is
"nowhere," friends.

The Babel SystemJS transform targets the `System.register` API, which
is&mdash;how do I put this gently?&mdash;well, it's an API you would never
want to write by hand. Unfortunately for us, that awkwardness was
conceived under the assumption that `import` declarations will only appear
at the top level, as all imported symbols must be hoisted into a single
enclosing scope, and updated using a series of setter functions.

If you don't believe me, read
[this](https://github.com/ModuleLoader/es6-module-loader/blob/master/docs/system-register.md)
and then behold the consequences:

```js
import { a, b } from "./asdf";
import { c } from "./zxcv";
console.log(a + b + c);
```

is compiled (by Babel) thus:

```js
System.register(["./asdf", "./zxcv"], function (_export, _context) {
  "use strict";

  var a, b, c;
  return {
    setters: [function (_asdf) {
      a = _asdf.a;
      b = _asdf.b;
    }, function (_zxcv) {
      c = _zxcv.c;
    }],
    execute: function () {
      console.log(a + b + c);
    }
  };
});
```

The one big advantage of this transform is that it uses normal variables
for `a`, `b`, and `c`, so the debugging experience is somewhat better than
the other transforms, as long as you have source maps enabled.

**tl;dr** All three transforms fail to support nested `import`
declarations for different reasons, but none of those reasons are really
fundamental. It would be a mistake to let these imperfect implementations
influence our decision about nested `import` declarations, and if anyone
tries to tell you that nested `import` declarations are impossible to
transpile, I assure you they are misinformed.

### "Reasoning about conditional imports is hard"

There are an infinite variety of ways to write hard-to-understand
spaghetti code, some more problematic than others.

If you believe that nested `import` declarations will be especially
difficult to understand, don't write them, and raise your concerns with
other programmers who abuse them.

Used tastefully, nested `import` declarations have the potential to
improve the readability and maintainability of your code immensely, for
all the reasons discussed in other sections.

I firmly believe our community has the ability to develop conventions for
appropriate use of nested `import` declarations. If nested imports prove
mostly unproblematic, that's great. If they must be used sparingly, we'll
write linter rules that forbid them, and tools like Webpack or Browserify
can refuse to compile them.

Given the potential benefits, and the debatability of the drawbacks, it
would be a mistake for the ECMAScript language specification to enforce
the top-level restriction before we've experienced the alternative.

# But how?!

Why, dear readers: that is exactly what [`reify`](https://github.com/benjamn/reify) does.
