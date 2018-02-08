import { name } from "../version.js"

function toOptInError(error) {
  if (error.code === "ERR_REQUIRE_ESM") {
    error.message = error.message.replace("Must use import", "Must opt-in " + name)
  }

  return error
}

export default toOptInError
