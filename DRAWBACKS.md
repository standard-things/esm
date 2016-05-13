Drawbacks
---

* Only works with CommonJS module systems that are very similar to Node's module system.
* Adds some overhead to module evaluation.
* ~~Affects every yet-to-be required module in the Node process.~~<br>
  _Only modules in packages that explicitly depend on `reify`._
* Not a general solution for other kinds of JavaScript compilation.
* Not a solution for asynchronous module loading, yet.
