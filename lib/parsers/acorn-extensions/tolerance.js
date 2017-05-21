"use strict";

function enable(parser) {
  // It's not Reify's job to enforce strictness.
  parser.strict = false;
  // Tolerate recoverable parse errors.
  parser.raiseRecoverable = noopRaiseRecoverable;
}

exports.enable = enable;

function noopRaiseRecoverable() {}
