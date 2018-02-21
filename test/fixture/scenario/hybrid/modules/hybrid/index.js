const { foo } = require('./sub');

exports.bar = function bar() {
  return foo();
}
