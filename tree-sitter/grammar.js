module.exports = grammar({
  name: "bmake",
  rules: {
    identifier: ($) => /[a-zA-Z_][a-zA-Z_0-9]*/,
    //source_file: ($) => repeat($._stmt),
    source_file: ($) => $.var_assign,
    _stmt: ($) => choice($.var_assign, $.append_assign),
    word: ($) => $.identifier,
    var_assign: ($) =>
      seq(field("identifier", $.identifier), "=", field("value", $.restOfLine)),
    append_assign: ($) =>
      seq(field("identifier", $.identifier), "+", field("value", $.restOfLine)),
  },
  // prettier-ignore
  /*
  extras: ($) => [
    /#[^\n]* /, // comments
    / \t\n/ // whitespace
  ],
  */
  externals: $ => [ 
    $.restOfLine
  ],
});
