// https://bsw-wiki.bentley.com/bin/view.pl/Main/BmakeOverview

const ident_regex = /[a-zA-Z_][a-zA-Z0-9_]*/;

module.exports = grammar({
  name: "bmake",
  rules: {
    // NOTE: the first rule is the one is the top-level one!
    source_file: ($) => repeat(choice($._stmt, $.rule)),
    body: ($) => repeat1(choice($._stmt, $.rule)),
    identifier: ($) => ident_regex,
    // FIXME: probably need to allow escaping spaces or quoting or something
    path: ($) => /[^\s]+/,
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

    dep: ($) => /[^,]*/,

    deps: ($) => seq(repeat(seq($.dep, ",")), $.dep),

    dep_dir_list: ($) => seq("{", seq(repeat(seq($.path, ";")), $.path), "}"),
    dep_ext_list: ($) => seq("(", seq(repeat(seq($.path, ",")), $.path), ")"),

    ext_decl: ($) => seq(".", token.immediate(ident_regex)),

    dep_ext: ($) =>
      choice(
        $.ext_decl,
        // TODO: create one-or-more delimited list abstraction
        seq(
          ".",
          // REPORTME: can't do token.immediate here for some reason
          optional($.dep_dir_list),
          choice(field("exts", $.dep_ext_list), field("ext", $.identifier))
        )
      ),

    target_ext: ($) => $.ext_decl,

    command: ($) => $.restOfLine,
    command_mod: ($) =>
      choice(
        alias("~", $.ignore_status),
        alias("|", $.silent_echo),
        alias("!", $.no_newline),
        $.builtin_command
      ),

    // FIXME: incomplete and lacking optional argument
    builtin_command: ($) =>
      seq("~", token.immediate(choice("current", "time", "task", "mkdir"))),

    // FIXME: making command_mod optional (which it should be) is wreaking havoc on performance
    build_command: ($) => seq($.command_mod, $.command),

    rule: ($) =>
      seq(
        choice(alias("always", $.always), seq($.dep_ext, $.target_ext)),
        ":",
        // FIXME: probably need outdent support...
        repeat($.build_command)
      ),

    // also known as `built-in functions`
    expansion_mod: ($) => /@\w+/,

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
        prec(1, seq("defined", "(", alias($.identifier, $.is_defined), ")")),
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
