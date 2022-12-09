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
import unittest
# from collections import defaultdict

# TODO: align name better with zigify
def zigify(n: tree_sitter.Node):
    if n.type not in to_zig:
        if not n.is_named:
            print(f"warning: unknown node type: '{n.type}'", file=sys.stderr)
            return n.text.decode('utf8')
        else:
            raise KeyError(f"unknown named ast node type: '{n.type}'")
    return to_zig[n.type](n)

diagnostic_headers = {
    "%error": "Error occurred: {s}",
    "%message": "Message: {s}",
    "%warn": "Warning: {s}",
}

header = """\
const std = @import("std");

pub fn main() void {
"""

footer = """\
}
"""

def build_command_no_newline(n: tree_sitter.Node) -> str:
    cmd = n.children[1].text.decode("utf8")
    return f'''\
        if (!silent) {{
            std.debug.print("{cmd}");
            const status = std.runCmd("{cmd}");
            if (status != 0)
                return error.CmdFailed;
        }}\
    '''

# for f-strings
NL = '\n'

to_zig = {
    'body': lambda n: '\n'.join(map(zigify, n.children)),
    'source_file': lambda n: header + to_zig['body'](n) + footer,
    'if': lambda n: (
        f'if ({zigify(n.child_by_field_name("cond"))}) {{\n{zigify(n.named_children[2])}\n}}'
        + (''
          if len(n.named_children) == 3
          else f' else {{\n{zigify(n.named_children[3])}}}'
          )
        + '\n'
    ),
    'diagnostic': lambda n: f'std.debug.print("{diagnostic_headers[n.children[0].type]}", .{{"{n.children[1].text.decode("utf8")[1:]}"}});\n',
    'comment': lambda n: f'//{n.text.decode("utf8")[1:]}\n',
    'is_defined': lambda n: f'std.env.getVar("{zigify(n.named_children[0])}")',
    'identifier': lambda n: n.text.decode('utf8'),
    'rule': lambda n: zigify(n.named_children[1])
                      if n.named_children[0].type == 'always'
                      else f'std.build.AddBuildStep("{n.named_children[0].text}");',
    'rule_body': lambda n: '{\n' + '\n'.join(map(zigify, n.children)) + '\n}',
    'build_command': lambda n: {
        'silent_echo': f'std.debug.print("\\n{n.children[1].text.decode("utf8")}");\n',
        'no_newline': build_command_no_newline,
    }[n.children[0].children[0].type],
    'assign': lambda n: f'var {zigify(n.child_by_field_name("identifier"))} = "{zigify(n.child_by_field_name("value"))}";',
    'append_assign': lambda n: f'{zigify(n.child_by_field_name("identifier"))} += "{zigify(n.child_by_field_name("value"))}";',
    'restOfLine': lambda n: n.text.decode('utf8'),
    'not': lambda n: f'!{zigify(n.children[1])}',
    'and': lambda n: f'{zigify(n.children[0])} and {zigify(n.children[2])}',
    'eq': lambda n: f'{zigify(n.children[0])} == {zigify(n.children[2])}',
    'expand': lambda n: zigify(n.children[0]),
    'expand_arg': lambda n: zigify(n.children[0]),
    'recursive_expand': lambda n: f'context.{zigify(n.named_children[0])}',
    'ERROR': lambda n: f'##### ERROR{NL}{NL.join("# " + l for l in n.text.decode("utf8"))}{NL}##### END ERROR',
    ####
    'var_basename_no_ext': lambda n: 'getCurrentFileName()',
    ####

    # NOTE: this is a harder one. May have to perform inclusions before passing the results to tree_parser.
    # the same could be said about eval too
    'include': lambda n: transform_text(open(n.children[1], 'r').open())
}

tree_sitter.Language.build_library(
    'build/bmake.so',
    ['tree-sitter']
)

class _TransformTests(unittest.TestCase):
    def test_if(self):
        ast = bmake_parser.parse(b'''\
            # PRG implies no asserts.
            %if defined (PRG)
                %if defined (DEBUG)
                    %error Cannot define PRG and DEBUG.
                %endif
                %if !defined(NDEBUG) && !defined(PRG_NO_NDEBUG)
                    always:
                        |Setting NDEBUG=1 because PRG was set.
                    
                    NDEBUG = 1
                %endif
            %endif
        ''')

        transformed = zigify(ast.root_node)

        # TODO: dedent (if I used zig I could use the nice \\ multiline string literals...)
        # NOTE: I actually did start bindings for tree_sitter in zig in another project
        self.assertEqual(transformed, '''\
            if(){}
''')

BMAKE_LANG = tree_sitter.Language('build/bmake.so', 'bmake')

bmake_parser = tree_sitter.Parser()
bmake_parser.set_language(BMAKE_LANG)

def transform_text(text: str) -> str:
    src = bytes(text, 'utf8')
    ast = bmake_parser.parse(src)
    return zigify(ast.root_node)

if __name__ == '__main__':
    import sys
    import argparse
    import os
    argparser = argparse.ArgumentParser(
        description="convert to bmake files to zig"
    )
    argparser.add_argument("-f", "--file", help="file to parse", default=sys.stdin)
    argparser.add_argument("-o", "--out", help="file/directory to output to", default=os.path.join(os.getcwd(), "out"))
    argparser.add_argument("-x", "--overwrite", help="overwrite --out", default=False, action="store_true")
    argparser.add_argument("-z", "--zig-fmt", help="run zig fmt on the output", action="store_true")
    args = argparser.parse_args()
    if isinstance(args.file, str):
        args.file = open(args.file, 'r')
    

    with open(args.out, 'w' if args.overwrite else 'x') as out:
        out.write(transform_text(args.file.read()))

    if args.zig_fmt:
        import subprocess
        subprocess.call(["zig", "fmt", args.out])

    with open(args.out) as output:
        for l in output:
            print(l, end="")

