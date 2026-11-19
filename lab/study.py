"""A study as the lab sees it: its study.json, and its algorithm module imported from the folders the page imports
it from, so the lab runs exactly the code the page runs."""
import importlib
import inspect
import json
import os
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
STUDIES = os.path.join(ROOT, 'studies')


class Study:
    def __init__(self, sid):
        self.id = sid
        self.dir = os.path.join(STUDIES, sid)
        with open(os.path.join(self.dir, 'study.json')) as f:
            self.manifest = json.load(f)
        py = self.manifest.get('python')
        if not py:
            raise ValueError(f'study {sid} has no Python')
        self.paths = [os.path.normpath(os.path.join(self.dir, p)) for p in py['paths']]
        for p in reversed(self.paths):
            if p not in sys.path:
                sys.path.insert(0, p)
        self.module = importlib.import_module(py['entry'])
        self.data = os.path.join(self.dir, 'data', 'raw')

    @property
    def versions(self):
        return list(self.module.VERSIONS)

    def read(self, path):
        return self.module.read(path)

    def run(self, version, image, services=None, damaged=None, **params):
        """damaged: the image's damaged areas, handed to a version that takes them, as the page hands them."""
        fn = self.module.VERSIONS[version]
        if takes(fn, 'damaged'):
            params = dict(params, damaged=damaged or [])
        return drive(fn(image, **params), {} if services is None else services)

    def stage(self, name, image, answer, services=None, **args):
        return drive(self.module.STAGES[name](image, answer, **args), {} if services is None else services)

    def score(self, answer, truth, damaged=None):
        """damaged: the image's damaged areas, handed to a scorer that takes them."""
        if takes(self.module.score, 'damaged'):
            return self.module.score(answer, truth, damaged=damaged or [])
        return self.module.score(answer, truth)

    @property
    def scoring(self):
        return self.module.SCORING

    def metrics_path(self):
        rel = (self.manifest.get('algorithms') or {}).get('metrics')
        return rel and os.path.join(self.dir, rel)


def takes(fn, name):
    """Whether fn takes a keyword argument of that name, as the page's bridge asks it."""
    try:
        ps = inspect.signature(fn).parameters.values()
    except (TypeError, ValueError):
        return False
    return any(p.name == name or p.kind == p.VAR_KEYWORD for p in ps)


def drive(result, services):
    """A version's answer: its return value, or, for a version that is a generator, what it returns once every
    request it yields, (service, *args), has been answered by that service."""
    if not inspect.isgenerator(result):
        return result
    try:
        request = next(result)
        while True:
            name, *args = request
            try:
                serve = services[name]
            except KeyError:
                raise RuntimeError(f'the version asks for {name!r}, which this run does not serve') from None
            request = result.send(serve(*args))
    except StopIteration as done:
        return done.value
