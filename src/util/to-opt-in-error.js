function toOptInError(error) {
  if (error.code === "ERR_REQUIRE_ESM") {
    error.message = error.message.replace("Must use import", "Must opt-in @std/esm")
  }

  return error
}

export default toOptInError
