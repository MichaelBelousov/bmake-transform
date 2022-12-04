// https://bsw-wiki.bentley.com/bin/view.pl/Main/BmakeOverview

module.exports = grammar({
  name: "bmake",
  rules: {
    // NOTE: the first rule is the one is the top-level one!
    source_file: ($) => repeat($._stmt),
    body: ($) => repeat1($._stmt),
    identifier: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,
    _stmt: ($) =>
      choice(
        $.assign,
        $.append_assign,
        $.expanding_assign,
        $.diagnostic,
        $.directive,
        $.if
      ),

    word: ($) => choice("defined", $.identifier),

    assign: ($) =>
      // NOTE: will have to manually evaluate `$()` in restOfLine
      seq(field("identifier", $.identifier), "=", field("value", $.restOfLine)),
    append_assign: ($) =>
      seq(field("identifier", $.identifier), "+", field("value", $.restOfLine)),
    expanding_assign: ($) =>
      seq(field("identifier", $.identifier), "=%", $.restOfLine),
    append_expanding_assign: ($) =>
      seq(field("identifier", $.identifier), "+%", $.restOfLine),

    builtin_macro: ($) =>
      choice(
        alias("$@", $.current_target_file),
        alias("$?", $.deps_newer_than_target),
        alias("$=", $.newest_dep),
        alias("$<", $.current_dep),
        alias("$*", $.target_basename),
        alias("$%", $.first_dep_dirname),
        alias("$&", $.all_deps),
        alias("$!", $.unexpanded_full_decl_decl),
        alias("$$", $.dollar_sign), // would an external/custom scanner help here?
        alias("_MakeFileSpec", $.top_lvl_mke_abs_path),
        alias("_MakeFilePath", $.current_mke_dirname),
        alias("_MakeFile", $.current_mke_basename),
        alias("_MakeFileName", $.current_mke_basename_no_ext),
        // mkf is mki or mke file
        alias("_CurrentFileSpec", $.current_mkf_abs_path),
        alias("_CurrentFilePath", $.current_mkf_dirname)
      ),
    restOfLine: ($) => /[^\n]*/,
    comment: ($) => token(/#.*/),
    if_start: ($) =>
      choice("%if", "%ifndef", "%ifdef", "%elif", "%iffile", "%ifnofile"),
    if: ($) =>
      choice(
        // FIXME: so apparently `if` will expand defined macros without expansion syntax,
        // so `if` must support tokenizing the condition line
        seq(
          // do I need a custom scanner to really capture conditions?
          alias($.if_start, "if"),
          field("cond", $._expr),
          "\n",
          $.body,
          "%endif"
        ),
        seq(
          alias($.if_start, "if"),
          field("cond", $._expr),
          "\n",
          $.body,
          "%else",
          $.body,
          "%endif"
        )
      ),
    always: ($) => seq("always:", $.body),

    // also known as `built-in functions`
    expansion_mod: ($) =>
      choice(
        alias("@basename", $.mod_basename_no_ext),
        alias("@dir", $.mod_dirname),
        alias("@suffix", $.mod_ext),
        alias("@nonsuffix", $.mod_path_no_ext)
      ),

    expand_arg: ($) =>
      choice(
        alias("@B", $.var_basename_no_ext),
        alias("@D", $.var_dirname),
        alias("@E", $.var_ext),
        alias("@F", $.var_basename),
        alias("@R", $.var_path_no_ext),
        $.identifier
      ),

    expand_args: ($) => seq(repeat(seq($.expand_arg, ",")), $.expand_arg),

    recursive_expand: ($) => seq("$(", $.expand_arg, ")"),
    recursive_expand_strip_trailing_slash: ($) => seq("${", $.expand_arg, "}"),
    non_recursive_expand: ($) =>
      seq("$[", choice($.expand_arg, seq($.expansion_mod, $.expand_args)), "]"),
    expand: ($) =>
      choice(
        $.recursive_expand,
        $.recursive_expand_strip_trailing_slash,
        $.non_recursive_expand
      ),

    _expr: ($) =>
      choice(
        // unary
        prec(1, seq("!", $._expr)),
        prec(1, alias(seq("defined", "(", $.identifier, ")"), $.define)),
        prec.left(2, seq($._expr, "==", $._expr)),
        prec.left(3, seq($._expr, "||", $._expr)),
        prec.left(4, seq($._expr, "&&", $._expr)),
        $.expand
      ),

    // technically a directive
    diagnostic: ($) =>
      choice(
        seq("%warn", $.restOfLine),
        seq("%message", $.restOfLine),
        seq("%error", $.restOfLine)
      ),

    directive: ($) =>
      choice(
        seq("%include", alias($.restOfLine, $.path)),
        seq("%search", alias($.restOfLine, $.path)),
        seq("%undef", $.identifier)
      ),
  },
  // prettier-ignore
  extras: ($) => [
    $.comment,
    /\s/, // whitespace
  ],
});
