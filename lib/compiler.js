var parse;
var acorn = require("acorn");
var types = require("ast-types");
var MagicString = require("magic-string");
var parserOptions = {
  ecmaVersion: 7,
  sourceType: "module",
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  allowHashBang: true
};

function compile(code, options) {
  var ast = acorn.parse(code, parserOptions);
  importExportVisitor.visit(ast, code);
  return importExportVisitor.magicString.toString();
}

exports.compile = compile;

var importExportVisitor = new types.PathVisitor.fromMethodsObject({
  reset: function (ast, code) {
    this.code = code;
    this.magicString = new MagicString(code);
  },

  pad: function (newCode, oldStart, oldEnd) {
    var oldCode = this.code;
    var oldLines = oldCode.slice(oldStart, oldEnd).split("\n");
    var newLines = newCode.split("\n");
    var diff = oldLines.length - newLines.length;
    while (diff --> 0) {
      newLines.push("");
    }
    return newLines.join("\n");
  },

  overwrite: function (oldStart, oldEnd, newCode, trailing) {
    var padded = this.pad(newCode, oldStart, oldEnd);

    if (oldStart === oldEnd) {
      if (padded === "") {
        return;
      }

      if (trailing) {
        this.magicString.insertLeft(oldStart, padded);
      } else {
        this.magicString.insertRight(oldStart, padded);
      }

    } else {
      this.magicString.overwrite(oldStart, oldEnd, padded);
    }
  },

  visitImportDeclaration: function (path) {
    var decl = path.node;
    var parts = [];

    if (decl.specifiers.length > 0) {
      // It's tempting to use let instead of var when possible, but that
      // makes it impossible to redeclare variables, which is quite handy.
      parts.push("var ");

      decl.specifiers.forEach(function (s, i) {
        var isLast = i === decl.specifiers.length - 1;
        parts.push(s.local.name);
        if (s.type === "ImportNamespaceSpecifier") {
          // Initialize the local name for `* as local` specifiers so that
          // we don't have to initialize it in the setter function.
          parts.push("={}");
        }
        parts.push(isLast ? ";" : ",");
      });
    }

    parts.push(toModuleImport(
      this.code.slice(
        decl.source.start,
        decl.source.end),
      computeSpecifierMap(decl.specifiers)
    ));

    this.overwrite(
      decl.start,
      decl.end,
      parts.join("")
    );

    return false;
  },

  visitExportAllDeclaration: function (path) {
    var decl = path.node;

    this.overwrite(
      decl.start,
      decl.source.start,
      "module.import("
    );

    this.overwrite(
      decl.source.end,
      decl.end,
      ",{'*':function(v,k){exports[k]=v;}});",
      true
    );

    return false;
  },

  visitExportDefaultDeclaration: function (path) {
    var code = this.code;
    var decl = path.node;
    var dd = decl.declaration;

    if (dd.type === "FunctionDeclaration" ||
        dd.type === "ClassDeclaration") {
      // If the exported default value is a function or class declaration,
      // it's important that the declaration be visible to the rest of the
      // code in the exporting module, so we must avoid compiling it to a
      // named function or class expression.

      var specifierMap = {};
      specifierMap[dd.id.name] = "default";

      this.overwrite(
        decl.start, dd.start,
        toModuleExport(specifierMap)
      );

      this.visit(path.get("declaration"));

      this.overwrite(
        dd.end,
        decl.end,
        "",
        true
      );

    } else {
      // Otherwise, since the exported value is an expression, it's
      // important that we wrap it with parentheses, in case it's
      // something like a comma-separated sequence expression.
      this.overwrite(decl.start, dd.start, "exports.default=(");
      this.visit(path.get("declaration"));
      this.overwrite(dd.end, decl.end, ");module.export();", true);
    }
  },

  visitExportNamedDeclaration: function (path) {
    var code = this.code;
    var decl = path.node;
    var dd = decl.declaration;

    if (dd) {
      var specifierMap = {};
      if (dd.type === "ClassDeclaration" ||
          dd.type === "FunctionDeclaration") {
        specifierMap[dd.id.name] = dd.id.name;
      } else if (dd.type === "VariableDeclaration") {
        dd.declarations.forEach(function (ddd) {
          specifierMap[ddd.id.name] = ddd.id.name;
        });
      }

      this.overwrite(
        decl.start, dd.start,
        toModuleExport(specifierMap)
      );

      this.visit(path.get("declaration"));

      this.overwrite(dd.end, decl.end, "", true);

      return;
    }

    if (decl.specifiers) {
      if (decl.source) {
        var map = computeSpecifierMap(decl.specifiers, true);
        if (map) {
          var newMap = {};

          Object.keys(map).forEach(function (local) {
            newMap["exports." + local] = map[local];
          });

          map = newMap;
        }

        this.overwrite(
          decl.start,
          decl.end,
          toModuleImport(code.slice(
            decl.source.start,
            decl.source.end
          ), map)
        );

      } else {
        this.overwrite(
          decl.start,
          decl.end,
          toModuleExport(computeSpecifierMap(decl.specifiers))
        );
      }
    }

    return false;
  }
});

// If inverted is true, the local variable names will be the values of the
// map instead of the keys.
function computeSpecifierMap(specifiers, inverted) {
  var specifierMap;

  specifiers.forEach(function (s) {
    var local = s.local.name;
    var __ported = // The IMported or EXported name.
      s.type === "ImportSpecifier" ? s.imported.name :
      s.type === "ImportDefaultSpecifier" ? "default" :
      s.type === "ImportNamespaceSpecifier" ? "*" :
      s.type === "ExportSpecifier" ? s.exported.name :
      null;

    if (typeof local !== "string" ||
        typeof __ported !== "string") {
      return;
    }

    specifierMap = specifierMap || {};

    if (inverted === true) {
      specifierMap[__ported] = local;
    } else {
      specifierMap[local] = __ported;
    }
  });

  return specifierMap;
}

function toModuleImport(source, specifierMap) {
  var parts = ["module.import(", source];
  var locals = specifierMap && Object.keys(specifierMap);

  if (! locals || locals.length === 0) {
    parts.push(");");
    return parts.join("");
  }

  parts.push(",{");

  locals.forEach(function (local, i) {
    var isLast = i === locals.length - 1;
    var imported = specifierMap[local];
    var valueParam = safeParam("v", local);

    parts.push(
      JSON.stringify(imported),
      ":function(", valueParam
    );

    if (imported === "*") {
      // When the imported name is "*", the setter function may be called
      // multiple times, and receives an additional parameter specifying
      // the name of the property to be set.
      var nameParam = safeParam("n", local, valueParam);
      parts.push(
        ",", nameParam, "){",
        // The local variable should have been initialized as an empty
        // object when the variable was declared.
        local, "[", nameParam, "]=", valueParam
      );
    } else {
      parts.push("){", local, "=", valueParam);
    }

    parts.push(isLast ? "}" : "},");
  });

  parts.push("});");

  return parts.join("");
}

var slice = Array.prototype.slice;

function safeParam(param) {
  var args = slice.call(arguments);
  if (args.indexOf(param, 1) < 0) {
    return param;
  }
  args[0] = "_" + param;
  return safeParam.apply(this, args);
}

function toModuleExport(specifierMap) {
  var locals = specifierMap && Object.keys(specifierMap);

  if (! locals || locals.length === 0) {
    return "";
  }

  var parts = ["module.export({"];

  locals.forEach(function (local, i) {
    var isLast = i === locals.length - 1;
    var exported = specifierMap[local];

    parts.push(
      exported,
      ":function(){return ",
      local,
      isLast ? "}" : "},"
    );
  });

  parts.push("});");

  return parts.join("");
}
