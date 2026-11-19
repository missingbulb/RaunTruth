"""The libraries the page loads from jsDelivr, installed under web-tests/node_modules at the versions the page pins,
for the page tests that run them under Node. The page's own code is the one list.
  python3 web-tests/page_libraries.py           install them
  python3 web-tests/page_libraries.py --check   exit 1 unless each is installed at its version
  python3 web-tests/page_libraries.py --list    print them, one package@version a line"""
import glob
import json
import os
import re
import subprocess
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PREFIX = os.path.join(ROOT, 'web-tests')
CDN = re.compile(r'cdn\.jsdelivr\.net/(?:npm/((?:@[\w.-]+/)?[\w.-]+)@([\w.-]+)|(pyodide)/v([\w.-]+)/)')


def libraries():
    found = set()
    for path in glob.glob(os.path.join(ROOT, 'web', '*.js')) + glob.glob(os.path.join(ROOT, 'studies', '*', 'web', '**', '*.js'), recursive=True):
        for m in CDN.finditer(open(path, encoding='utf-8').read()):
            found.add((m[1] or m[3], m[2] or m[4]))
    names = [name for name, _ in found]
    clash = sorted({n for n in names if names.count(n) > 1})
    if clash:
        sys.exit(f'the page pins more than one version of {clash}')
    return sorted(found)


def installed(name):
    try:
        return json.load(open(os.path.join(PREFIX, 'node_modules', name, 'package.json')))['version']
    except (OSError, ValueError, KeyError):
        return None


if __name__ == '__main__':
    libs = libraries()
    if not libs:
        sys.exit('no jsDelivr library found in the page code')
    if '--list' in sys.argv:
        print('\n'.join(f'{n}@{v}' for n, v in libs))
    elif '--check' in sys.argv:
        missing = [f'{n}@{v}' for n, v in libs if installed(n) != v]
        if missing:
            sys.exit(f'not installed: {" ".join(missing)} (python3 web-tests/page_libraries.py)')
    else:
        subprocess.run(['npm', 'install', '--silent', '--no-save', '--prefix', PREFIX, *(f'{n}@{v}' for n, v in libs)], check=True)
