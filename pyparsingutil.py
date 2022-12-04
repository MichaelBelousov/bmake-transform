#! /usr/bin/env python3

"""
utilities and basic patterns for pyparsing
"""

__author__ = 'Michael Belousov'

############ trace mac grammar ##################

# TODO: enumerate the many used pyparsing elements
#
from pyparsing import *  
from functools import reduce
from operator import add
from collections import OrderedDict as odict

# set pyparsing base class to suppress string literals
# by default, e.g. '(' + Word(nums) + ')' will yield
# only the number
# ParserElement.inlineLiteralsUsing(Suppress)

def perLine(elem):
    """
    convenience function equivalent to OneOrMore(Group(...))
    """
    return OneOrMore(Group(elem))

def seq(*args):
    """
    vararg sum, to prevent ugly "A+B+C+..",
    this is a style choice
    """
    return reduce(add, args)
    # TODO: use sum instead of reduce, 
    # return sum(args, Empty())

# TODO: remove (this isn't used)
def CombineSpaced(*args):
    """
    Combine but allow spacing, so you still get one parsed
    token
    """
    def intersperse(itr, delim):
        it = iter(itr)
        yield next(it)
        for x in it:
            yield delim
            yield x
    print(intersperse(args, Optional(White())))
    return Combine(*intersperse(args, Optional(White()))) 

# suppressed chars:
LPAR, RPAR, LBRACK, RBRACK, PERIOD, COMMA = (
        map(Suppress, r"""()[].,""")
    )
BSLASH, FSLASH, HASH, DASH, DQUOTES, SQUOTE, QUESMARK  = (
        map(Suppress, r"""\/#-"'?""")
    )

# I prefix patterns by 'p_', as a personal convention,
# to differentiate them from parsed data

# shorthand for literal
L = lambda t: Literal(t)

# TODO: why isn't this a decorator?
def makestrcmper_class(cls):
    """A wrapper around types that makes string 
    representation comparisons equivalent to regular 
    comparisons"""
    class StrCmper(cls):
        def __eq__(self, other):
            if isinstance(other, str):
                return str(self) == other
            else:
                return super().__eq__(other)
    StrCmper.__name__ = f'StrCmper({cls.__name__})'
    StrCmper.__doc__ = makestrcmper_class.__doc__
    return StrCmper

def makestrcmper(cls, *args, **kwargs):
    strcmpercls = makestrcmper_class(cls)
    return strcmpercls(*args, **kwargs)

p_number = Word(nums)
p_number.setParseAction(lambda s,l,t: int(t[0]))

class hexint(int):
    """A hexidecimal represented integer"""
    def __str__(self):
        return hex(self)
    def __repr__(self):
        return str(self)

p_hexit = Word(nums+'abcdefABCDEF')
p_hex_literal = Combine('0x'+p_hexit)
p_hex_literal.setParseAction(lambda s,l,t: hexint(t[0]))

p_identifier = Combine(Word(alphas) + Word(alphanums))
