#! /usr/bin/env python3

"""
convert bmake files to zig's build system

run tests with:

```sh
python -m unittest to_zig.py 
```
"""

__author__ = 'Michael Belousov'

import tree_sitter

tree_sitter.Language.build_library(
    'build/bmake.so',
    [
        'tree-sitter'
    ]
)

BMAKE_LANG = tree_sitter.Language('build/bmake.so', 'bmake')

bmake_parser = tree_sitter.Parser()
bmake_parser.set_language(BMAKE_LANG)


if __name__ == '__main__':
    import sys
    import argparse
    import os
    argparser = argparse.ArgumentParser(
        description="convert to bmake files to zig"
    )
    argparser.add_argument("-f", "--file", help="file to parse", default=sys.stdin)
    argparser.add_argument("-o", "--out", help="directory to output to", default=os.path.join(os.getcwd(), "out"))
    args = argparser.parse_args()
    if isinstance(args.file, str):
        args.file = open(args.file, 'r')
    src = bytes(args.file.read())
    ast = bmake_parser.parse(src)
