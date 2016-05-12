var assert = require("assert");
var parse = require("./parser.js").parse;

// TODO Cache this.
function compile(code) {
  var declarations = parse(code);
  return replace(code, declarations, function (decl) {
    return typeHandlers[decl.type](code, decl);
  });
}

exports.compile = compile;

function replace(code, nodes, callback) {
  var fragments = [];
  var lastEndIndex = code.length;

  for (var i = nodes.length - 1; i >= 0; --i) {
    var node = nodes[i];

    fragments.push(
      code.slice(node.end, lastEndIndex),
      pad(callback(node, i), code, node.start, node.end)
    );

    lastEndIndex = node.start;
  }

  fragments.push(code.slice(0, lastEndIndex));

  return fragments.reverse().join("");
}

var typeHandlers = {};

typeHandlers.ImportDeclaration = function (code, decl) {
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

  parts.push(toModuleImport(
    code.slice(decl.source.start,
               decl.source.end),
    computeSpecifierMap(decl.specifiers)
  ));

  return parts.join("");
};

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

    assert.strictEqual(typeof local, "string");
    assert.strictEqual(typeof __ported, "string");

    specifierMap = specifierMap || {};

    if (inverted === true) {
      specifierMap[__ported] = local;
    } else {
      specifierMap[local] = __ported;
    }
  });

  return specifierMap;
}

function toModuleImport(source, specifierMap, returnTrue) {
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

    var valueArg = "v";
    if (valueArg === local) {
      // Since we're creating a new scope, it's easy to avoid collisions
      // with the one other variable name that we care about.
      valueArg = "_" + valueArg;
    }

    parts.push(
      JSON.stringify(imported),
      ":function(", valueArg, "){",
      local, "=", valueArg,
      returnTrue ? ";return true" : "",
      isLast ? "}" : "},"
    );
  });

  parts.push("});");

  return parts.join("");
}

function toModuleExport(specifierMap) {
  var locals = specifierMap && Object.keys(specifierMap);

  if (! locals || locals.length === 0) {
    return "";
  }

  var parts = ["module.export("];

  if (locals.length === 1) {
    var local = locals[0];
    var exported = specifierMap[local];

    parts.push(
      JSON.stringify(exported),
      ",function(){return ",
      local,
      "});"
    );

    return parts.join("");
  }

  parts.push("{");

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

typeHandlers.ExportAllDeclaration = function (code, decl) {
  return [
    pad("module.import(", code, decl.start, decl.source.start),
    code.slice(decl.source.start,
               decl.source.end),
    pad(",{'*':function(all){" +
        "this.assign(exports,all);" +
        "return true;}});",
        code, decl.source.end, decl.end)
  ].join("");
};

typeHandlers.ExportDefaultDeclaration = function (code, decl) {
  var dd = decl.declaration;
  if (dd.type === "FunctionDeclaration" ||
      dd.type === "ClassDeclaration") {
    // If the exported default value is a function or class declaration,
    // it's important that the declaration be visible to the rest of the
    // code in the exporting module, so we must avoid compiling it to a
    // named function or class expression.
    var map = {};
    map[dd.id.name] = "default";
    return [
      pad("", code, decl.start, dd.start),
      exportDeclarationHelper(code, dd, map),
      pad("", code, dd.end, decl.end)
    ].join("");
  }

  return [
    // Otherwise, since the exported value is an expression, it's
    // important that we wrap it with parentheses, in case it's something
    // like a comma-separated sequence expression.
    pad("exports.__esModule=true;exports.default=(",
        code, decl.start, dd.start),
    compile(code.slice(dd.start, dd.end)),
    pad(");module.export();", code, dd.end, decl.end)
  ].join("");
};

typeHandlers.ExportNamedDeclaration = function (code, decl) {
  var dd = decl.declaration;
  if (dd) {
    return [
      pad("", code, decl.start, dd.start),
      typeHandlers[dd.type](code, dd),
      pad("", code, dd.end, decl.end)
    ].join("");
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

      return toModuleImport(
        code.slice(decl.source.start,
                   decl.source.end),
        map,
        true
      );

    } else {
      return toModuleExport(computeSpecifierMap(decl.specifiers));
    }
  }
};

typeHandlers.FunctionDeclaration =
typeHandlers.ClassDeclaration = function (code, decl) {
  var specifierMap = {};
  specifierMap[decl.id.name] = decl.id.name;
  return exportDeclarationHelper(code, decl, specifierMap);
};

typeHandlers.VariableDeclaration = function (code, decl) {
  var specifierMap = {};

  decl.declarations.forEach(function (dd) {
    specifierMap[dd.id.name] = dd.id.name;
  });

  return exportDeclarationHelper(code, decl, specifierMap);
};

function exportDeclarationHelper(code, decl, specifierMap) {
  return [
    compile(code.slice(decl.start, decl.end)),
    ";exports.__esModule=true;",
    toModuleExport(specifierMap)
  ].join("");
}

function pad(newCode, oldCode, oldStart, oldEnd) {
  var oldLines = oldCode.slice(oldStart, oldEnd).split("\n");
  var newLines = newCode.split("\n");
  var diff = oldLines.length - newLines.length;
  while (diff --> 0) {
    newLines.push("");
  }
  return newLines.join("\n");
}
