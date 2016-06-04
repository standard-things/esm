var hasOwn = Object.prototype.hasOwnProperty;
var entryMap = Object.create(null);

function Entry(id) {
  // Same as module.id for this module.
  this.id = id;
  // The number of times this.runModuleSetters has been called.
  this.runCount = 0;
  // Map from parent module identifiers to parent module objects.
  this.parents = Object.create(null);
  // Setters for assigning to local variables in parent modules.
  this.setters = Object.create(null);
  // Getters for local variables exported from this module.
  this.getters = Object.create(null);
}

var Ep = Entry.prototype;

Entry.get = function (id) {
  return entryMap[id] || null;
};

Entry.getOrCreate = function (id) {
  return entryMap[id] = entryMap[id] || new Entry(id);
};

Ep.addParent = function (module) {
  this.parents[module.id] = module;
};

Ep.addSetters = function (setters) {
  Object.keys(setters).forEach(function (name) {
    this.addSetter(name, setters[name]);
  }, this);
};

Ep.addSetter = function (name, setter) {
  if (typeof name === "string" &&
      typeof setter === "function" &&
      // Ignore any requests for the exports.__esModule property."
      name !== "__esModule") {
    (this.setters[name] =
     this.setters[name] || []
    ).push(setter);
  }
};

Ep.addGetters = function (getters) {
  Object.keys(getters).forEach(function (name) {
    this.addGetter(name, getters[name]);
  }, this);
};

Ep.addGetter = function (name, getter) {
  if (typeof name === "string" &&
      typeof getter === "function" &&
      // Ignore any requests for the exports.__esModule property."
      name !== "__esModule") {
    // Should this throw if hasOwn.call(this.getters, name)?
    this.getters[name] = getter;
  }
};

function runModuleSetters(module) {
  var entry = entryMap[module.id];
  if (entry) {
    entry.runModuleSetters(module);
  }
}

Ep.runModuleGetters = function (module) {
  var entry = this;
  Object.keys(entry.getters).forEach(function (name) {
    // Make sure we update module.exports[name] with the current value so
    // that CommonJS require calls remain consistent with module.import.
    module.exports[name] = entry.getters[name].call(module);
  });
};

Ep.runModuleSetters = function (module) {
  var entry = this;
  var shouldRunParentSetters = false;

  this.runModuleGetters(module);

  Object.keys(entry.setters).forEach(function (name) {
    var value = module.getExportByName(name);

    entry.setters[name].forEach(function (setter) {
      if (name === "*") {
        Object.keys(value).forEach(function (name) {
          if (name !== "__esModule" &&
              callSetter(module, setter, name, value[name]) === true) {
            shouldRunParentSetters = true;
          }
        });
      } else if (callSetter(module, setter, name, value) === true) {
        shouldRunParentSetters = true;
      }
    });
  });

  ++entry.runCount;

  if (shouldRunParentSetters) {
    entry.runParentSetters();
  }
};

function callSetter(module, setter, name, value) {
  setter.last = setter.last || Object.create(null);
  if (! hasOwn.call(setter.last, name) ||
      value !== setter.last[name]) {
    return setter.call(
      module,
      setter.last[name] = value,
      name
    );
  }
}

Ep.runParentSetters = function () {
  var parents = this.parents;
  Object.keys(parents).forEach(function (id) {
    runModuleSetters(parents[id]);
  });
};

exports.Entry = Entry;
