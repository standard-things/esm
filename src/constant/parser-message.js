const PARSER_MESSAGE = {
  __proto__: null,
  ILLEGAL_HTML_COMMENT: "HTML comments are not allowed in modules",
  ILLEGAL_IMPORT_EXPORT_IN_MODULE: "'import' and 'export' may only appear at the top level",
  ILLEGAL_IMPORT_EXPORT_IN_SCRIPT:"'import' and 'export' may only be used in ES modules",
  ILLEGAL_IMPORT_META_IN_MODULE:"The only valid meta property for 'import' is 'import.meta'",
  ILLEGAL_IMPORT_META_IN_SCRIPT:"Cannot use 'import.meta' outside a module",
  ILLEGAL_NEW_TARGET:"new.target expression is not allowed here",
  ILLEGAL_RETURN_STATEMENT:"Illegal return statement",
  UNEXPECTED_EOS:"Unexpected end of input",
  UNEXPECTED_EVAL_OR_ARGUMENTS:"Unexpected eval or arguments in strict mode",
  UNEXPECTED_RESERVED_WORD:"Unexpected reserved word",
  UNEXPECTED_STRICT_MODE_RESERVED_WORD:"Unexpected strict mode reserved word",
  UNEXPECTED_TOKEN:"Invalid or unexpected token",
  UNTERMINATED_ARGUMENTS_LIST:"missing ) after argument list",
  UNTERMINATED_TEMPLATE:"Unterminated template literal"
}

export default PARSER_MESSAGE
