# Incremental ECMAScript Lexing

Demonstrates using an incremental parse.js parser to lex ECMAScript input from
a stream of user input. Caches and reuses past partial lexings.

This is a general demonstration of incremental parsing with unmodified parsers.
There are much more efficient ways to handle incremental lexing specifically.
