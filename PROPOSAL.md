# ECMAScript Proposal: Nested `import` declarations

**Stage:** 0

**Champion:** Ben Newman (Meteor Development Group)

**Specification:** Work in progress; see attached [commits](https://github.com/tc39/ecma262/pull/646/commits).


## Summary

This proposal argues for relaxing the current restriction that `import` declarations may appear only at the top level of a module.

Specifically, this proposal would allow `import` declarations that are

1. **nestable** within functions and blocks, enabling multiple new and worthwhile `import` idioms;
1. **hoisted** to the beginning of the enclosing scope; that is, _declarative_ rather than _imperative_;
1. **lexically scoped** to the enclosing block;
1. **synchronously evaluated**, with clear and manageable consequences for runtime module fetching; and
1. **backwards compatible** with the semantics of existing top-level `import` declarations.

At this time, no changes are proposed regarding the placement or semantics of `export` declarations. In the opinion of the author, keeping all `export` declarations at the top level remains important for many of the static properties of the ECMAScript module system.


## Motivating examples

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

If `import` declarations could not appear in nested scopes, you would have to write this code differently:

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

This manual renaming is annoying, and potentially surprising to developers coming from other languages (or even Node), so there needs to be a good reason why it's necessary in JavaScript. Conversely, if it isn't necessary, because there exists a reasonable implementation of nested `import` declarations, then it becomes harder to claim we have a good reason for the top-level restriction.

In the second version of this code, since the `import` declarations are evaluated before the tests are defined, any exceptions thrown by importing the modules will prevent your tests from running at all! Compare this behavior to that of the original code, where each test captures any and all exceptions resulting from its own particular `import` declaration and `strictEqual(check(), ...)` call.

### Lazy evaluation

As the previous example suggests, putting all your `import` declarations at the top level of your modules means you pay the performance cost of evaluating all your modules at startup time, even if they are not used until much later&mdash;or in some cases never used at all.

If you have the ability to nest `import` declarations in the immediate scope where the imported symbols will be used, then you can take full advantage of your application's specific needs, and there is nothing to stop you from front-loading your imports if that makes sense for your application.

Eager evaluation of the entire dependency tree is fine for long-running applications like servers, but not so great for short-lived, multi-purpose utilities like command-line tools, or client-side applications that must evaluate modules while the user waits. For example, the [WebTorrent Desktop app](https://webtorrent.io/) was able to reduce startup time dramatically [by deferring `require` calls](https://mobile.twitter.com/WebTorrentApp/status/737890973733244928). This optimization would not have been possible if they could only use `import` declarations at the top level.

### Colocation of `import` declarations with consuming code

When you delete code that contains a nested `import` declaration, you don't have to scroll up to the top of the file and search through a laundry list of other `import` declarations, then search through the rest of the file for any other references to the imported symbols. The scope of the nested `import` declaration is obvious, so it's easy to tell when it's safe to delete.

### Optimistic imports

Perhaps you would like to use a module if it is available, but it's hardly the end of the world if it's not:

```js
try {
  import esc from "enhanced-super-console";
  console = esc;
} catch (e) {
  // That's ok, we'll just stick to the usual implementations of
  // console.log, .error, .trace, etc., or stub them out.
}
```

Without the ability to nest `import` declarations inside `try`-`catch` blocks, there would be no way to achieve this progressive enhancement of the `console` object.


### Dead code elimination

Nested `import` declarations make certain static optimizations significantly more effective; for example, dead code elimination via constant propagation.

A sophisticated bundling tool might eliminate unreachable code based on the known values of certain constants:

```js
if (__USER_ROLE__ === "admin") {
  import { setUpAdminTools } from "../admin/tools";
  setUpAdminTools(user.id);
}
```

Ideally this code would disappear completely from your public JavaScript assets (whenever `__USER_ROLE__ !== "admin"`), along with the `../admin/tools` module, assuming it is not used elsewhere by non-admin code.

> Aside: when `__USER_ROLE__ === "admin"`, note that the body of the condition must remain a block statement, so that `setUpAdminTools` remains scoped to that block, rather than becoming visible to surrounding code.  In other words, nested `import`s are still important even after dead code elimination has taken place.

Without the ability to nest `import` declarations inside conditional blocks, dead code elimination becomes the responsibility of the imported module. You would likely have to wrap the entire body of the `../admin/tools` module with a conditional block, and even then the empty `../admin/tools` module would still be included in the public bundle, which might constitute a leak of sensitive information.

Worse still, as long as `import` declarations are restricted to the top level, the `import`s of `../admin/tools` cannot be included in the conditional block, making any kind of dead module elimination impossible.


## Semantic details

### Backwards compatibility

At this stage of the ECMAScript specification, any backwards-incompatible change to the existing semantics of top-level `import` declarations would require extraordinary motivation.

This proposal makes no such suggestion. In fact, the viability of this proposal very much hinges on the technical possibility of allowing nested `import` declarations without breaking existing code.

For example (while I do not consider the precise evaluation order of modules to be a matter of backwards compatibility), I see no reason why a program that uses only top-level `import` declarations should necessarily evaluate its modules in a different order, just because nested `import` declarations are allowed.

In other words, I am proposing a strict expansion of the possible use cases for `import` declarations.


### Nesting

In terms of the grammar, I propose that

&nbsp;&nbsp;&nbsp;&nbsp;_ModuleItem_ :<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_ImportDeclaration_<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_ExportDeclaration_<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_StatementListItem_

&nbsp;&nbsp;&nbsp;&nbsp;_StatementListItem_ :<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_Statement_<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_Declaration_

be modified as follows:

&nbsp;&nbsp;&nbsp;&nbsp;_ModuleItem_ :<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_ExportDeclaration_<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_StatementListItem_

&nbsp;&nbsp;&nbsp;&nbsp;_StatementListItem_ :<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_Statement_<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_Declaration_<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_ImportDeclaration_

This modification has a few subtleties worth highlighting:

* It is important that _ImportDeclaration_ not be producible by a _Statement_ or a _Declaration_, else an _ExportDeclaration_ could export an _ImportDeclaration_, which is presumably undesirable.

* This grammar would not allow `import` declarations of the following form:

  ```js
  if (condition) import "./sometimes";
  ```
  though it would allow
  ```js
  if (condition) {
    import "./sometimes";
  }
  ```
  Though potentially surprising, this seems reasonable on the grounds that
  ```js
  if (condition) let foo = bar;
  ```
  is also currently illegal. However, if we want to allow braceless nested `import` declarations, it should be possible to modify the grammar for _IfStatement_ et al., so that the body/consequent/alternate can be either a _Statement_ or an _ImportDeclaration_.

* It is not immediately obvious from this new grammar that an _ImportDeclaration_ may only appear in a _Module_. I believe the specification should enforce this restriction, but I am currently unsure how best to do so. As I understand it, there are three possibilities:

  * Thread <sub>[Import]</sub> subscripts throughout the grammar, similar to
    <sub>[Yield,Return]</sub>.
  * Verbally forbid _ImportDeclaration_ from appearing unless the goal symbol
    is _Module_.
  * Rely on runtime errors.


### Declarative hoisting

TC39 has [previously discussed](https://github.com/tc39/ecma262/issues/368) at length whether `import` declarations should be *declarative* or *imperative*. In short, declarative `import` declarations take effect before any other code in the scope where the declaration appears, whereas imperative declarations may be interleaved with other declarations and statements.

I believe nested `import` declarations allow an elegant synthesis of these two possible semantic choices.

For selfish reasons, I was initially skeptical of declarative `import` declarations, because the imperative semantics are easier to implement with a [transpiler](https://github.com/benjamn/reify#how-it-works).  Declarative `import` declarations require "hoisting" code to the beginning of the enclosing block, whereas imperative declarations can simply be rewritten in place.

However, as I began to investigate the consequences of hoisting, I too became convinced that relying on the interleaving of `import` declarations with other statements is almost always a source of bugs, because you can only rarely know with confidence whether a particular `import` declaration is the first evaluator of the imported module.

With that said, there are occasionally scenarios where it's frustrating that you can't just put a `debugger` statement before an `import` declaration and step into the imported module, wrap an `import` declaration with timing code, or carefully manage the order of exports between two mutually dependent modules.

For those few scenarios, nested `import` declarations provide a convenient way of achieving imperative behavior: simply wrap the `import` in a `{...}` block statement or a function:

```js
import { a, b } from "./ab";

// Execution might hit this debugger statement before the "./xy" module is
// imported, if it has not been imported before.
debugger;
{
  import { x, y } from "./xy";
}

console.log("x", getX());

// Imperatively import { x } from "./xy", and return it.
function getX() {
  import { x } from "./xy";
  return x;
}

// If you care about the latest live value of x, return a closure.
function getXFn() {
  import { x } from "./xy";
  return () => x;
}

const getX2 = getXFn();

setTimeout(() => {
  console.log("current x:", getX2());
}, delay);
```

Even if you find this syntax clunky, and even if you don't end up using it in production code, you have to admit it's useful when you need it in development.

In other words, **nested `import` declarations clear the way for embracing declarative `import` semantics by default**, because nested `import` declarations provide a graceful escape hatch in rare cases when you think you need imperative `import` semantics.


### Lexical scoping

If `import` declarations are hoisted to the beginning of the enclosing block, it seems natural that the imported symbols would have visibility similar to `const`- or `let`-declared variables, rather than `var` declarations. The goal of hoisting is to make imported symbols reliably usable throughout the enclosing block, so exposing the symbols outside that block would undermine the benefits of hoisting.

I consider this point relatively uncontroversial, and perhaps even already implied by the specification, since a module is effectively a block scope within which top-level imported symbols are confined (i.e., they do not leak into the global environment).

If you need to use an imported value outside the block where it was imported, you would need to assign it to a variable in the outer scope. If you are worried about the symbol changing values due to live binding, then you can create a closure in the scope of the `import` declaration that refers to the current value of the imported symbol, assign the closure function to some outer variable, and call that function to access the latest value of the imported symbol.


### Synchronous evaluation

Given that the [WHATWG Loader Standard](https://github.com/whatwg/loader) has adopted an asynchronous (`Promise`-based) API for module loading, it is tempting to imagine a desugaring from `import` declarations to something like `await` expressions, e.g.

```js
import { a, b } from "./c";
```

might be interpreted as

```js
const { a, b } = await loader.import("./c");
```

This desugaring story has a number of fundamental flaws that lead me to believe nested `import` declarations should not be explained through desugaring, and that the `loader.import` API should continue to serve the important role of enabling _explicit_ asynchronous module loading.

Problems with desugaring to asynchronous forms:

* JavaScript has a strong precedent against any kind of implicit asynchronicity, or non-cooperative preemption, which is why we have `yield` and `await` instead of full coroutines or threads. Asynchronous module loading should be done explicitly using the `Promise`-based Loader API (or `<script type=module>`).

* Conditional imports with dynamic conditions would summon the spectre of [Z&#856;&#844;&#859;&#864;&#794;&#844;&#804;&#846;&#809;&#798;&#827;&#801;&#807;&#841;&#809;&#824;a&#789;&#780;&#784;&#850;&#862;&#783;&#771;&#768;&#819;&#813;&#800;&#866;&#857;&#827;&#826;&#860;&#813;l&#786;&#786;&#779;&#835;&#768;&#862;&#825;&#839;&#845;&#853;&#837;&#798;&#822;g&#850;&#833;&#772;&#850;&#850;&#776;&#793;&#791;&#866;&#806;&#812;&#840;&#814;&#805;&#824;o&#833;&#786;&#785;&#830;&#789;&#780;&#862;&#793;&#854;&#799;&#804;&#815;&#815;](http://blog.izs.me/post/59142742143/designing-apis-for-asynchrony).

* If we make nested `import` declarations asynchronous, then for consistency we should make top-level `import` declarations behave the same way, but that would likely be a backwards-incompatible change.

* A sequence of `import` declarations would have to be awaited in series rather than in parallel, because interleaving module execution is not acceptable, but that would mean missing the important opportunity to fetch module _sources_ in parallel.

* The `const { a, b } =` destructuring above does not behave identically to live immutable bindings, and it's not immediately obvious how any simple desugaring could faithfully achieve live-binding semantics.

* Most importantly, assuming a reasonable runtime strategy for synchronously evaluating `import` declarations exists (and it does!), we should strongly prefer it over any asynchronous alternative.


#### How synchronous `import` declarations would work in browsers

When designing the JavaScript specification, we have a unique responsibility to consider the burdens we may be imposing on client-side implementations of the language.

While most other programming language environments (including Node) can assume their modules are immediately available, JavaScript running in the browser must fetch any unavailable modules over the network, and it is too late to perform that fetching at the point when an `import` declaration needs to be evaluated.

What then is the deadline for completing any asynchronous module fetching?  Although there may be situations where a sophisticated runtime can be more clever, in general the runtime must fetch the transitive closure of module dependencies _before it begins to evaluate the entry point module_.

In other words, the `System.import(id)` or `<script type=module>` that loads the original entry point module must first

1. fetch the source for the entry point module;
1. scan it for requested module identifier strings (which does not require a full parse!);
1. resolve those requested module identifiers relative to the parent module;
1. asynchronously fetch the sources of the requested modules (in parallel);
1. scan the requested modules for additional dependencies;
1. fetch their sources in parallel;
1. etc. etc. until closure reached; and
1. only then begin evaluating the entry point module, with full confidence
   that all requested modules will be immediately available.

This process certainly sounds expensive, but it is really no different from what the browser must already do to support top-level `import` declarations.  Think about it: if you can't nest `import` declarations, you have to hoist them manually to the top level anyway, which does not change the HTTP workload of the runtime at all!

From the perspective of the fetching process, all requested module identifier strings are treated the same, whether top-level or nested. Without fancy static analysis, all requested module identifiers must be regarded as dependencies that _might_ be immediately evaluated by the module. Moving `import` declarations in and out of nested scopes does not affect the set of dependencies requested by the module.  So again, nested `import` declarations do not invite any new performance problems.

And while it might seem easier to parse `import` declarations at the top level, remember that parsing the top level still requires examining the entire module. It should come as some relief (regardless of this proposal) that this process does not require a full parse, because the runtime can simply tokenize the module source until it hits an `import` or `export` token, then begin parsing from that starting point. This works equally well whether the declaration is at the top level or in some nested scope. The token stream can even be saved for later, if desired.

Though this process may involve many HTTP requests for a large application, those requests can be highly parallel, and performance will benefit from technologies like HTTP/2 and Service Workers. I would just recommend that the fetching protocol permit servers to return more modules than requested, so that the depth of the request tree can be minimized by sophisticated developers.


## Conclusion

I hope that this document convinces you that backwards-compatible, nestable, declarative, lexically scoped, synchronous `import` declarations are viable and desirable.

More generally, I hope that the existence of this proposal will invite specific technical discussion, and finally put to rest the question-begging objection that nested `import` declarations are "forbidden by the ECMAScript specification."

That's exactly what I'm trying to change, after all.

## FAQ

TBD
