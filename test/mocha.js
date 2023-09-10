const utils = require("mocha/lib/utils.js")
const canonicalize = utils.canonicalize

utils.canonicalize = (value, stack, typeHint) => {
    const t = typeHint || utils.type(value)
    if (t === "module") {
        typeHint = "object"
    }
    // mocha's function blows up on module types

    return canonicalize(value, stack, typeHint)
}
