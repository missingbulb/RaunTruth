"""req/shell/python/on-run: the finders the NoR page offers, and each one's controls, are there before any Python
starts: web/finders.GENERATED.json says what the algorithm's controls say.

Regenerate with: python3 studies/nor/algorithm/controls.py > studies/nor/web/finders.GENERATED.json
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'algorithm'))
import controls


def test_the_page_lists_what_the_finders_say_now():
    listed = json.load(open(os.path.join(HERE, '..', 'web', 'finders.GENERATED.json')))
    regenerate = 'regenerate: python3 studies/nor/algorithm/controls.py > studies/nor/web/finders.GENERATED.json'
    assert listed == json.loads(json.dumps(controls.listing())), regenerate
    assert list(listed['finders']) == list(controls.FINDERS)
