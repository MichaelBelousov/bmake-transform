module.exports = grammar({
  name: "bmake",
  rules: {
    identifier: ($) => /[a-zA-Z_][a-zA-Z_0-9]*/,
    source_file: ($) => repeat($.stmt),
    stmt: ($) => choice($.var_assign, $.append_assign),
    var_assign: ($) =>
      seq(field("identifier", $.identifier), "=", field("value", $.value)),
    append_assign: ($) =>
      seq(field("identifier", $.identifier), "+", field("value", $.value)),
    // NOTE: how the heck will this work?
    restOfLine: ($) => /[^\n]*/,
  },
  // prettier-ignore
  extras: ($) => [
    /#[^\n]*/, // comments
    / \t\n/ // whitespace
  ],
});
