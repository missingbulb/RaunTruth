"""The libraries the page loads from jsDelivr, installed under web-tests/node_modules at the versions the page pins,
for the page tests that run them under Node and for the tests' fake of jsDelivr (fakes/cdn.mjs), and beside
Pyodide the packages the studies' study.json files name, from Pyodide's own folder on jsDelivr, each checked
against pyodide-lock.json's SHA-256. The page's own code and the studies' study.json files are the one list.
  python3 web-tests/page_libraries.py           install them
  python3 web-tests/page_libraries.py --check   exit 1 unless each is installed at its version
  python3 web-tests/page_libraries.py --list    print them, one package@version or Pyodide package a line"""
import glob
import hashlib
import json
import os
import re
import subprocess
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PREFIX = os.path.join(ROOT, 'web-tests')
CDN = re.compile(r'cdn\.jsdelivr\.net/(?:npm/((?:@[\w.-]+/)?[\w.-]+)@([\w.-]+)|(pyodide)/v([\w.-]+)/)')


def libraries(root=ROOT):
    found = set()
    for path in glob.glob(os.path.join(root, 'web', '*.js')) + glob.glob(os.path.join(root, 'studies', '*', 'web', '**', '*.js'), recursive=True):
        for m in CDN.finditer(open(path, encoding='utf-8').read()):
            found.add((m[1] or m[3], m[2] or m[4]))
    names = [name for name, _ in found]
    clash = sorted({n for n in names if names.count(n) > 1})
    if clash:
        sys.exit(f'the page pins more than one version of {clash}')
    return sorted(found)


def packages():
    """The Pyodide packages the studies' study.json files name."""
    names = set()
    for path in glob.glob(os.path.join(ROOT, 'studies', '*', 'study.json')):
        names |= set((json.load(open(path, encoding='utf-8')).get('python') or {}).get('packages', []))
    return sorted(names)


def wheels():
    """[(file name, sha256)] of those packages, as the installed Pyodide's lock lists them; none before it is installed."""
    lock = os.path.join(PREFIX, 'node_modules', 'pyodide', 'pyodide-lock.json')
    if not os.path.exists(lock):
        return []
    listed = json.load(open(lock))['packages']
    return [(listed[n]['file_name'], listed[n]['sha256']) for n in packages()]


def wheel_ok(name, sha):
    path = os.path.join(PREFIX, 'node_modules', 'pyodide', name)
    return os.path.exists(path) and hashlib.sha256(open(path, 'rb').read()).hexdigest() == sha


def fetch_wheels():
    pyodide = dict(libraries()).get('pyodide')
    for name, sha in wheels():
        if wheel_ok(name, sha):
            continue
        url = f'https://cdn.jsdelivr.net/pyodide/v{pyodide}/full/{name}'
        subprocess.run(['curl', '-fsSL', '--retry', '3', '-o', os.path.join(PREFIX, 'node_modules', 'pyodide', name), url], check=True)
        if not wheel_ok(name, sha):
            sys.exit(f'{name} from {url} does not match pyodide-lock.json')


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
        print('\n'.join([f'{n}@{v}' for n, v in libs] + [f'pyodide package {n}' for n in packages()]))
    elif '--check' in sys.argv:
        missing = [f'{n}@{v}' for n, v in libs if installed(n) != v] + [name for name, sha in wheels() if not wheel_ok(name, sha)]
        if missing:
            sys.exit(f'not installed: {" ".join(missing)} (python3 web-tests/page_libraries.py)')
    else:
        subprocess.run(['npm', 'install', '--silent', '--no-save', '--prefix', PREFIX, *(f'{n}@{v}' for n, v in libs)], check=True)
        fetch_wheels()
