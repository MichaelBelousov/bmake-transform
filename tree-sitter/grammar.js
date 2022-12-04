module.exports = grammar({
  name: "bmake",
  rules: {
    // NOTE: the first rule is the one is the top-level one!
    source_file: ($) => repeat($._stmt),
    identifier: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,
    _stmt: ($) => choice($.var_assign, $.append_assign),
    word: ($) => $.identifier,
    var_assign: ($) =>
      seq(field("identifier", $.identifier), "=", field("value", $.restOfLine)),
    append_assign: ($) =>
      seq(field("identifier", $.identifier), "+", field("value", $.restOfLine)),
    restOfLine: ($) => /[^\n]*/,
    comment: ($) => token(/#.*/),
  },
  // prettier-ignore
  extras: ($) => [
    $.comment,
    /\s/, // whitespace
  ],
});
