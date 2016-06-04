var parse;

function compile(code, options) {
  if (typeof parse !== "function") {
    parse = require("./parser.js").parse;
  }

  var declarations = parse(code);
  var identical = declarations.length === 0;

  if (options && typeof options === "object") {
    options.identical = identical;
  }

  if (identical) {
    return code;
  }

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

    parts.push(
      returnTrue ? ";return true" : "",
      isLast ? "}" : "},"
    );
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
    pad(",{'*':function(v,k){" +
        "exports[k]=v;" +
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
    pad("exports.default=(",
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
    ";",
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
