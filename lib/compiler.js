var hasOwn = Object.prototype.hasOwnProperty;
var Parser = require("acorn").Parser;
var parserOptions = {
  ecmaVersion: 7,
  sourceType: "module",
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  allowHashBang: true
};

// TODO Cache this.
exports.compile = function (code) {
  var declarations = [];
  var keywordPattern = /\b(import|export)\b/g;
  var match;

  while ((match = keywordPattern.exec(code))) {
    var node = parseFrom(code, match.index);
    if (node && hasOwn.call(typeHandlers, node.type) &&
        (node.type === "ImportDeclaration" ||
         node.type === "ExportAllDeclaration" ||
         node.type === "ExportNamedDeclaration")) {
      declarations.push(node);
    }
  }

  return replace(code, declarations);
};

function parseFrom(code, startIndex) {
  var p = new Parser(parserOptions, code, startIndex);
  p.nextToken();
  try {
    var node = p.parseStatement();
  } finally {
    return node;
  }
}

function replace(code, declarations) {
  var fragments = [];
  var lastStartIndex = code.length;

  for (var i = declarations.length - 1; i >= 0; --i) {
    var decl = declarations[i];

    fragments.push(
      code.slice(decl.end, lastStartIndex),
      // TODO Pad to as many lines as original.
      typeHandlers[decl.type](decl, code)
    );

    lastStartIndex = decl.start;
  }

  fragments.push(code.slice(0, lastStartIndex));

  return fragments.reverse().join("");
}

// TODO Always generate a trailing semicolon!
var typeHandlers = {
  ImportDeclaration: function (decl, code) {
    var parts = [];

    if (decl.specifiers.length > 0) {
      parts.push("var ");
      decl.specifiers.forEach(function (s, i) {
        var isLast = i === decl.specifiers.length - 1;
        parts.push(s.local.name, isLast ? ";" : ",");
      });
    }

    parts.push(
      "module.import(",
      code.slice(decl.source.start,
                 decl.source.end),
      ",{"
    );

    decl.specifiers.forEach(function (s, i) {
      var local = s.local.name;
      var imported =
        s.type === "ImportSpecifier" ? s.imported.name :
        s.type === "ImportDefaultSpecifier" ? "default" :
        s.type === "ImportNamespaceSpecifier" ? "*" :
        null;

      var valueArg = "v";
      if (valueArg === local) {
        // Since we're creating a new scope, it's easy to avoid collisions
        // with the one other variable name that we care about.
        valueArg = "_" + valueArg;
      }

      var isLast = i === decl.specifiers.length - 1;
      parts.push(
        JSON.stringify(imported),
        ":function(", valueArg, "){",
        local, "=", valueArg,
        isLast ? "}" : "},"
      );
    });

    parts.push("});");

    return parts.join("");
  },

  // TODONT Provide Object.assign polyfill?
  ExportAllDeclaration: function (decl, code) {
    return [
      "module.import(",
      code.slice(decl.source.start,
                 decl.source.end),
      ",{'*':function(all){",
      "this.assign(exports,all);",
      "return true;",
      "}});"
    ].join("");
  },

  ExportNamedDeclaration: function (decl, code) {
    console.log(decl);
    return code.slice(decl.start, decl.end);
  }
};
