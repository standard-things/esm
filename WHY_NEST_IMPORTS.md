# The case for nested `import` statements

## Context

Since the publication of the [ECMASCript 2015
standard](http://www.ecma-international.org/ecma-262/6.0/), which
introduced [new syntax](http://www.2ality.com/2014/09/es6-modules-final.html)
for statically analyzable `import` and `export` statements, the JavaScript
community has fallen under the impression that it would be unwise to let
these statements appear anywhere except at the *top level* of a module. In
particular, this restriction would forbid nesting `import` statements in
conditional blocks or other nested scopes.

Because I respect the intelligence and free opinions of those who support
this restriction, I have written this document with three goals in mind:

  1. to provide real-world examples of the problems that nested `import` statements can solve,
  2. to entertain and carefully critique every reason one might have for supporting the restriction, and
  3. to show how nested `import` statements can be implemented correctly and efficiently in all versions of Node and most other CommonJS module systems, today.

**Note:** this document does not take a position on the usefulness or
advisability of nested `export` statements. I have never personally
encountered a scenario that called for putting `export` statements inside
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

Consider writing a simple BDD-style unit test that involves importing a symbol called `check` from three different modules:

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

If `import` statements could not appear in nested scopes, you would have to write this code differently:

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
it. Since the `import` statements are evaluated before the tests are
defined, any exceptions thrown by importing the modules will prevent your
tests from running at all! Compare this behavior to that of the original
code, where each test captures any and all exceptions resulting from its
own particular `import` statement and `strictEqual(check(), ...)` call.

### Colocation of `import` statements with consuming code

When you delete code that contains a nested `import` statement, you don't
have to scroll up to the top of the file and search through a laundry list
of other `import` statements, then search through the rest of the file for
any other references to the imported symbols. The scope of the nested
`import` statement is obvious, so it's easy to tell when it's safe to
delete.

### Lazy evaluation

As the previous example suggests, putting all your `import` statements at
the top level of your modules means you pay the performance cost of
evaluating all your modules at startup time, even if they are not used
until much later&mdash;or in some cases never used at all!

If you have the ability to nest `import` statements in the immediate scope
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
statements at the top level.

To put it in even stronger terms, if we do not allow ourselves to nest
`import` statements, then serious applications will never be able to stop
using the CommonJS `require` function, and JavaScript modules will remain
an awkward hybrid of modern and legacy styles.

Is that a future we can tolerate?

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

Without the ability to nest `import` statements inside `try`-`catch`
blocks, there would be no way to achieve this progressive enhancement of
the `console` object.

### "Isomorphic" code

### Dead code elimination

### Automatic code splitting


## Objections and critiques

### "Nested `import` statements prevent static analysis"

ECMASCript 2015 module syntax supports two important kinds of static analysis:

1. Detecting attempts to import symbols from modules that do not export
   those symbols.
2. Detecting when an exported symbol is never imported, so the
   corresponding implementation can be eliminated.

ES2015 module syntax makes these analyses possible by forcing symbols to
be named individually as part of the `import` or `export` statement,
rather than exposing the entire `exports` object, and by enforcing that
module identifiers are always string literals, so there is no equivalent
of the CommonJS `require(dynamicVariable)` confusion.

CommonJS happily exposes the entire `exports` object, which can then leak
into highly dynamic code that is impossible for static tools to
understand; and it does not enforce that module identifiers are always
string literals, which means it's usually impossible to make sense of
`require(dynamicVariable)` calls.

**Nested `import` statements pose no threat to either of these static analyses.**

Why? Nested `import` statements still have string literal source
identifiers, and still require symbols to be named individually. The only
new behavior is that some nested `import` statements might never be
evaluated. Because that question is difficult to answer at compile time,
we have to assume the worst, and imagine that the `import` statement
always executes. In other words, the potential use of an imported symbol
is no different from the 100%-certain use of an imported symbol, as far as
static analysis is concerned.

Think about it: if you couldn't nest `import` statements, you would have
to hoist them to the top level of the module anyway, where they would be
guaranteed to execute, even when the module is not needed at
runtime. What's the point of that?

Finally, languages that are much more concerned with static analysis than
JavaScript, such as Scala, somehow [get away with nesting
imports](https://www.safaribooksonline.com/library/view/scala-cookbook/9781449340292/ch07s07.html).

### "The specification forbids nested `import` statements"

http://www.ecma-international.org/ecma-262/6.0/index.html#sec-modules

### "Nested `import` statements are difficult to transpile"

* Babel renaming
* SystemJS limitations

### "Reasoning about conditional imports is hard"

There are an infinite variety of ways to write hard-to-understand
spaghetti code, some more problematic than others.

If you believe that nested `import` statements will be especially
difficult to understand, don't write them, and raise your concerns with
other programmers who abuse them.

Used tastefully, nested `import` statements have the potential to improve
the readability and maintainability of your code immensely, for all the
reasons discussed in other sections.
