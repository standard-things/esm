const actual = await Promise.resolve(true)
console.log("top-level-await:" + actual)
