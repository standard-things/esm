var hasOwn = Object.prototype.hasOwnProperty;
var assert = require("assert");
var acorn = require("acorn-es7-plugin")(require("acorn"));
var types = require("ast-types");
var n = types.namedTypes;
var b = types.builders;
var MagicString = require("magic-string");
var utils = require("./utils.js");
var parserOptions = {
  ecmaVersion: 7,
  plugins: {
    asyncawait: true
  },
  sourceType: "module",
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  allowHashBang: true
};

function compile(code, options) {
  var parser = new acorn.Parser(parserOptions, code);
  parser.strict = false;
  var ast = parser.parse();
  var rootPath = new types.NodePath(ast);

  importExportVisitor.visit(rootPath, code);
  importExportVisitor.finalizeHoisting();

  assignmentVisitor.visit(
    rootPath,
    importExportVisitor.magicString,
    importExportVisitor.exportedLocalNames
  );

  return importExportVisitor.magicString.toString();
}

exports.compile = compile;

var importExportVisitor = new types.PathVisitor.fromMethodsObject({
  reset: function (rootPath, code) {
    this.code = code;
    this.magicString = new MagicString(code);
    this.bodyPaths = [];
    this.exportedLocalNames = Object.create(null);
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
        return this;
      }

      if (trailing) {
        this.magicString.insertLeft(oldStart, padded);
      } else {
        this.magicString.insertRight(oldStart, padded);
      }

    } else {
      this.magicString.overwrite(oldStart, oldEnd, padded);
    }

    return this;
  },

  getBlockBodyPath: function (path) {
    var bodyPath = path;
    var stmtPath = bodyPath && bodyPath.parentPath;
    var insertIndex = bodyPath.value.start;

    while (stmtPath) {
      if (n.Program.check(stmtPath.value)) {
        assert.strictEqual(bodyPath.name, "body");
        insertIndex = stmtPath.value.start;
        break;
      }

      if (n.BlockStatement.check(stmtPath.value)) {
        assert.strictEqual(bodyPath.name, "body");

        if (hasOwn.call(stmtPath.value, "start")) {
          insertIndex = stmtPath.value.start + 1;
        } else {
          insertIndex = bodyPath.value[0].start;
        }

        break;
      }

      if (n.SwitchCase.check(stmtPath.value)) {
        assert.strictEqual(bodyPath.name, "consequent");
        insertIndex = bodyPath.value[0].start;
        break;
      }

      if (n.Statement.check(stmtPath.value)) {
        var block = b.blockStatement([bodyPath.value]);

        this.magicString
          .insertLeft(insertIndex = bodyPath.value.start, "{")
          .insertRight(bodyPath.value.end, "}");

        bodyPath.replace(block);
        stmtPath = bodyPath;
        bodyPath = stmtPath.get("body");

        break;
      }

      bodyPath = stmtPath;
      stmtPath = bodyPath.parentPath;
    }

    // Avoid hoisting above string literal expression statements such as
    // "use strict", which may depend on occurring at the beginning of
    // their enclosing scopes.
    bodyPath.value.some(function (stmt, i) {
      if (stmt.type === "ExpressionStatement") {
        var expr = stmt.expression;
        if (expr.type === "StringLiteral" ||
            (expr.type === "Literal" &&
             typeof expr.value === "string")) {
          insertIndex = stmt.end;
          return;
        }
      }
      return true;
    });

    if (hasOwn.call(bodyPath, "_insertIndex")) {
      assert.strictEqual(bodyPath._insertIndex, insertIndex);

    } else {
      bodyPath._insertIndex = insertIndex;
      bodyPath._hoistedExportsMap = Object.create(null);
      bodyPath._hoistedExportsString = "";
      bodyPath._hoistedImportsString = "";

      this.bodyPaths.push(bodyPath);
    }

    return bodyPath;
  },

  hoistExports: function (path, mapOrString, childName) {
    this.preserveChild(path, childName);

    var bodyPath = this.getBlockBodyPath(path);

    if (utils.isPlainObject(mapOrString)) {
      utils.assign(bodyPath._hoistedExportsMap, mapOrString);
    } else if (typeof mapOrString === "string") {
      bodyPath._hoistedExportsString += mapOrString;
    }

    return this;
  },

  hoistImports: function (path, hoistedCode, childName) {
    this.preserveChild(path, childName);
    var bodyPath = this.getBlockBodyPath(path);
    bodyPath._hoistedImportsString += hoistedCode;
    return this;
  },

  preserveChild: function (path, childName) {
    if (childName) {
      var childPath = path.get(childName);

      this.overwrite(
        path.value.start,
        childPath.value.start,
        ""
      ).overwrite(
        childPath.value.end,
        path.value.end,
        ""
      );

      this.visit(childPath);

    } else {
      this.overwrite(path.value.start, path.value.end, "");
    }

    return this;
  },

  finalizeHoisting: function () {
    this.bodyPaths.forEach(function (bodyPath) {
      var parts = [];

      var namedExports = toModuleExport(bodyPath._hoistedExportsMap);
      if (namedExports) {
        parts.push(namedExports);
      }

      if (bodyPath._hoistedExportsString) {
        parts.push(bodyPath._hoistedExportsString);
      }

      if (bodyPath._hoistedImportsString) {
        parts.push(bodyPath._hoistedImportsString);
      }

      if (parts.length > 0) {
        this.magicString.insertRight(
          bodyPath._insertIndex,
          parts.join("")
        );
      }
    }, this);
  },

  visitImportDeclaration: function (path) {
    var decl = path.value;
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

    this.hoistImports(path, parts.join(""));

    return false;
  },

  visitExportAllDeclaration: function (path) {
    var decl = path.value;
    var parts = [
      this.pad("module.import(", decl.start, decl.source.start),
      this.code.slice(decl.source.start,
                      decl.source.end),
      this.pad(
        ",{'*':function(v,k){exports[k]=v;}});",
        decl.source.end,
        decl.end
      )
    ];

    this.hoistExports(path, parts.join(""));

    return false;
  },

  visitExportDefaultDeclaration: function (path) {
    var code = this.code;
    var decl = path.value;
    var dd = decl.declaration;

    if (dd.type === "FunctionDeclaration" ||
        dd.type === "ClassDeclaration") {
      // If the exported default value is a function or class declaration,
      // it's important that the declaration be visible to the rest of the
      // code in the exporting module, so we must avoid compiling it to a
      // named function or class expression.
      this.hoistExports(path, {
        "default": dd.id.name
      }, "declaration");

    } else {
      // Otherwise, since the exported value is an expression, it's
      // important that we wrap it with parentheses, in case it's
      // something like a comma-separated sequence expression.
      this.overwrite(
        decl.start, dd.start,
        'module.export("default",exports.default=('
      );

      this.visit(path.get("declaration"));

      this.overwrite(dd.end, decl.end, "));", true);
    }
  },

  visitExportNamedDeclaration: function (path) {
    var code = this.code;
    var decl = path.value;
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

      this.hoistExports(path, specifierMap, "declaration");
      this.addExportedLocalNames(specifierMap);

      return;
    }

    if (decl.specifiers) {
      var specifierMap = computeSpecifierMap(decl.specifiers, true);

      if (decl.source) {
        if (specifierMap) {
          var newMap = {};

          Object.keys(specifierMap).forEach(function (local) {
            newMap["exports." + local] = specifierMap[local];
          });

          specifierMap = newMap;
        }

        // Even though the compiled code uses module.import, it should
        // still be hoisted as an export, i.e. before actual imports.
        this.hoistExports(path, toModuleImport(code.slice(
          decl.source.start,
          decl.source.end
        ), specifierMap));

      } else {
        this.hoistExports(path, specifierMap);
        this.addExportedLocalNames(specifierMap);
      }
    }

    return false;
  },

  addExportedLocalNames: function (specifierMap) {
    if (specifierMap) {
      var exportedLocalNames = this.exportedLocalNames;
      Object.keys(specifierMap).forEach(function (exported) {
        var local = specifierMap[exported];
        // It's tempting to record the exported name as the value here,
        // instead of true, but there can be more than one exported name
        // per local variable, and we don't actually use the exported
        // name(s) in the assignmentVisitor, so it's not worth the added
        // complexity of tracking unused information.
        exportedLocalNames[local] = true;
      });
    }
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
  var exportedKeys = specifierMap && Object.keys(specifierMap);

  if (! exportedKeys ||
      exportedKeys.length === 0) {
    return "";
  }

  var parts = ["module.export({"];

  exportedKeys.forEach(function (exported, i) {
    var isLast = i === exportedKeys.length - 1;
    var local = specifierMap[exported];

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

var assignmentVisitor = new types.PathVisitor.fromMethodsObject({
  reset: function (rootPath, magicString, exportedLocalNames) {
    this.magicString = magicString;
    this.exportedLocalNames = exportedLocalNames;
  },

  visitAssignmentExpression: function (path) {
    return this._assignmentHelper(path, "left");
  },

  visitUpdateExpression: function (path) {
    return this._assignmentHelper(path, "argument");
  },

  visitCallExpression: function (path) {
    this.traverse(path);
    var callee = path.value.callee;
    if (callee.type === "Identifier" &&
        callee.name === "eval") {
      this._wrap(path);
    }
  },

  _assignmentHelper: function (path, childName) {
    this.traverse(path);
    var child = path.value[childName];
    if (child.type === "Identifier" &&
        hasOwn.call(this.exportedLocalNames, child.name)) {
      this._wrap(path);
    }
  },

  _wrap: function (path) {
    this.magicString.insertRight(
      path.value.start,
      "module.runModuleSetters("
    ).insertLeft(path.value.end, ")");
  }
});
