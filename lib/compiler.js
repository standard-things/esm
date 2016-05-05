var hasOwn = Object.prototype.hasOwnProperty;
var keywordPattern = /\b(import|export)\b/g;
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
  return new Compiler(code).compile();
};

function Compiler(code) {
  this.code = code;
}

var Cp = Compiler.prototype;

Cp.compile = function (start, end) {
  if (typeof start === "undefined") start = 0;
  if (typeof end === "undefined") end = this.code.length;

  keywordPattern.lastIndex = start;

  var match;
  var declarations = [];

  while ((match = keywordPattern.exec(this.code))) {
    if (match.index < end) {
      var node = this.parseFrom(match.index);
      if (node && hasOwn.call(Cp, node.type) &&
          (node.type === "ImportDeclaration" ||
           node.type === "ExportAllDeclaration" ||
           node.type === "ExportNamedDeclaration")) {
        declarations.push(node);

        // Any import or export statements contained by the current node
        // will be handled recursively below, so we must skip them here.
        keywordPattern.lastIndex = Math.max(
          keywordPattern.lastIndex,
          node.end
        );
      }
    }
  }

  return this.replace(declarations, function (decl) {
    return this[decl.type](decl);
  }, start, end);
};

// TODO Could this be cached in memory?
// TODO What if start falls in a string literal?
//      Might have to parse the whole file!
Cp.parseFrom = function (start) {
  var p = new Parser(parserOptions, this.code, start);
  p.nextToken();
  try {
    var node = p.parseStatement();
  } finally {
    return node;
  }
};

Cp.replace = function (nodes, callback, start, end) {
  var fragments = [];

  for (var i = nodes.length - 1; i >= 0; --i) {
    var node = nodes[i];

    // All the nodes we're given should fall within [start, end), but just
    // to be safe we ignore those that start or end outside that interval.
    if (node.end > end ||
        node.start < start) {
      continue;
    }

    fragments.push(
      this.code.slice(node.end, end),
      // TODO Pad to as many lines as original.
      callback.call(this, node, i)
    );

    end = node.start;
  }

  fragments.push(this.code.slice(start, end));

  return fragments.reverse().join("");
};

// TODO Always generate a trailing semicolon!

Cp.ImportDeclaration = function (decl) {
  var code = this.code;
  var parts = [];

  if (decl.specifiers.length > 0) {
    // It's tempting to use let instead of var when possible, but that
    // makes it impossible to redeclare variables, which is quite handy.
    parts.push("var ");

    decl.specifiers.forEach(function (s, i) {
      var isLast = i === decl.specifiers.length - 1;
      parts.push(s.local.name, isLast ? ";" : ",");
    });
  }

  parts.push(
    "module.import(",
    this.code.slice(decl.source.start,
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
};

Cp.ExportAllDeclaration = function (decl) {
  return [
    "module.import(",
    this.code.slice(decl.source.start,
                    decl.source.end),
    ",{'*':function(all){",
    "this.assign(exports,all);",
    "return true;",
    "}});"
  ].join("");
};

Cp.ExportNamedDeclaration = function (decl) {
  var dd = decl.declaration;
  if (dd) {
    return this[dd.type](dd);
  }

  if (decl.specifiers) {
    // TODO
  }
};

Cp.FunctionDeclaration =
Cp.ClassDeclaration = function (decl) {
  return [
    this.compile(decl.start, decl.end),
    ";exports.", decl.id.name, "=", decl.id.name, ";"
  ].join("");
};

Cp.VariableDeclaration = function (decl) {
  return this.replace(decl.declarations, function (item) {
    return this.replace([
      item.id,
      item.init
    ], function (node, i) {
      if (i === 0) {
        // node === item.id
        return node.name + " = exports." + node.name;
      }

      if (i === 1) {
        // node === item.init
        return this.compile(node.start, node.end);
      }

    }, item.start, item.end);
  }, decl.start, decl.end);
};
