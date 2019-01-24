// Error messages are based on V8.
// https://github.com/v8/v8/blob/master/src/message-template.h

const MESSAGE = {
  ILLEGAL_AWAIT_IN_NON_ASYNC_FUNCTION: "await is only valid in async function",
  ILLEGAL_HTML_COMMENT: "HTML comments are not allowed in modules",
  ILLEGAL_IMPORT_META_OUTSIDE_MODULE: "Cannot use 'import.meta' outside a module",
  ILLEGAL_NEW_TARGET: "new.target expression is not allowed here",
  ILLEGAL_RETURN_STATEMENT: "Illegal return statement",
  INVALID_ESCAPED_RESERVED_WORD: "Keyword must not contain escaped characters",
  INVALID_IMPORT_META_ASSIGNMENT: "'import.meta' is not a valid assignment target",
  INVALID_LEFT_HAND_SIDE_ASSIGNMENT: "Invalid left-hand side in assignment",
  INVALID_OR_UNEXPECTED_TOKEN: "Invalid or unexpected token",
  UNEXPECTED_EOS: "Unexpected end of input",
  UNEXPECTED_EVAL_OR_ARGUMENTS: "Unexpected eval or arguments in strict mode",
  UNEXPECTED_IDENTIFIER: "Unexpected identifier",
  UNEXPECTED_RESERVED_WORD: "Unexpected reserved word",
  UNEXPECTED_STRICT_MODE_RESERVED_WORD: "Unexpected strict mode reserved word",
  UNEXPECTED_STRING: "Unexpected string",
  UNEXPECTED_TOKEN: "Unexpected token",
  UNTERMINATED_ARGUMENTS_LIST: "missing ) after argument list",
  UNTERMINATED_TEMPLATE: "Unterminated template literal"
}

export default MESSAGE
