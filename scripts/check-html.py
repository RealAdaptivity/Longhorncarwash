#!/usr/bin/env python3
"""Validate HTML tag nesting to catch stray / unbalanced tags.

This exists because a single stray </div> once closed <main> early and blanked
out several views (Schedule/Ops/Settings). This check fails the build if any
container element is closed by a mismatched tag, a stray end tag appears, or an
element is left unclosed at end of file.

Usage: python3 scripts/check-html.py [file.html ...]   (defaults to index.html)
"""
import sys
from html.parser import HTMLParser

# Elements that never have a closing tag.
VOID = {
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
    'meta', 'param', 'source', 'track', 'wbr',
}


class Checker(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.stack = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        if tag in VOID:
            return
        self.stack.append((tag, self.getpos()[0]))

    def handle_startendtag(self, tag, attrs):
        # Self-closing tag (<div/>) — opens and closes at once, ignore.
        return

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                if i != len(self.stack) - 1:
                    inner = ', '.join(f'<{t}> (opened line {ln})'
                                      for t, ln in self.stack[i + 1:])
                    self.errors.append(
                        f'{self.path}:{self.getpos()[0]}: </{tag}> forces '
                        f'these still-open element(s) to close early: {inner}')
                self.stack = self.stack[:i]
                return
        self.errors.append(
            f'{self.path}:{self.getpos()[0]}: '
            f'stray </{tag}> with no matching open tag')


def check(path):
    with open(path, encoding='utf-8') as f:
        checker = Checker(path)
        checker.feed(f.read())
    for tag, ln in checker.stack:
        checker.errors.append(f'{path}:{ln}: <{tag}> is never closed')
    return checker.errors


def main():
    files = sys.argv[1:] or ['index.html']
    errors = []
    for path in files:
        errors += check(path)
    if errors:
        print('HTML structure check FAILED:')
        for err in errors:
            print('  ' + err)
        sys.exit(1)
    print('HTML structure OK (' + ', '.join(files) + ')')


if __name__ == '__main__':
    main()
