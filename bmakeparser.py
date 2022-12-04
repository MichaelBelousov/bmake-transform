#! /usr/bin/env python3

"""
python parser for bmake files

run tests with:

```sh
python -m unittest bmakeparser.py 
```
"""

__author__ = 'Michael Belousov'

############ trace mac grammar ##################

# TODO: enumerate the many used pyparsing elements
#
from pyparsingutil import *  
import unittest

p_expr = p_hex_literal | p_number

p_decl_var_stmt = sum(
    p_identifier ('identifier'),
    Suppress('='),
    restOfLine ('value')
)

p_appendto_var_stmt = sum(
    p_identifier ('identifier'),
    Suppress('+'),
    restOfLine ('value')
)

p_stmt = (
    p_decl_var_stmt
    | p_appendto_var_stmt 
)

p_module = (
    OneOrMore(p_stmt)
).ignore(pythonStyleComment)

class _TestParseModule(unittest.TestCase):
    def test_parse(self):
        src = None
        with open('testdata/clang_common_opts.mki') as f:
            src = f.read()
