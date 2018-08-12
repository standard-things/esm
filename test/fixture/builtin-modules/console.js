console.log(
  new Map([
    [1,[1,2,3], null, void 0, NaN],
    [{ test:3, f:"abc"}, 5],
    [Promise, new Set(["esm", () => 1, class A {}])],
    [new WeakMap([[{test:1}]]), new WeakSet([() => {}])]
  ])
)
