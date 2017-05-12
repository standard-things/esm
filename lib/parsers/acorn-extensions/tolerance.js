"use strict";

exports.enable = function (parser) {
  // It's not Reify's job to enforce strictness.
  parser.strict = false;
  // Tolerate recoverable parse errors.
  parser.raiseRecoverable = noopRaiseRecoverable;
};

function noopRaiseRecoverable() {}
