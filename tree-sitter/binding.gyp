{
  "targets": [
    {
      "target_name": "tree_sitter_bmake_binding",
      "include_dirs": [
        "<!(node -e \"require('nan')\")",
        "src"
      ],
      "sources": [
        "bindings/node/binding.cc",
        "src/parser.c",
        # external scanner
        "src.scanner.cc",
      ],
      "cflags_c": [
        "-std=c99",
      ]
    }
  ]
}
