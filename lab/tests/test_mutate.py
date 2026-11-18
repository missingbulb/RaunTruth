"""The lab's item-level tools: a version spec and a mutation parse into their parts, and a null mutant is the same on
every run, so the chance bar a sweep reports can be reproduced."""
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
import items
import mutate


def test_a_spec_names_its_version_and_parameters_even_a_dict_of_them():
    assert items.parse('tl') == ('tl', {})
    assert items.parse('tl:half=0.3,bend=20') == ('tl', {'half': 0.3, 'bend': 20})
    assert items.parse('tl:values={"min_snr":4,"purity":0.2},off=["dim"]') == ('tl', {'values': {'min_snr': 4, 'purity': 0.2}, 'off': ['dim']})


def test_a_mutation_names_its_slot_trick_planes_parameters_and_quantile():
    assert mutate.parse('verify:unsharp-mask(r_u=1.5,amount=2)@nav:reject=0.2') == ('verify', 'unsharp-mask', ['nav'], 'reject', {'r_u': 1.5, 'amount': 2}, 0.2)
    assert mutate.parse('pre:white-tophat@nav+caspr') == ('pre', 'white-tophat', ['nav', 'caspr'], None, {}, None)


def test_a_null_mutant_is_reproducible_and_each_slot_has_its_nulls():
    img = np.random.default_rng(0).random((40, 40))
    for kind in ('pre', 'verify'):
        fn = mutate.trick_fn('null-3', kind)
        assert np.array_equal(fn(img, 2.0), fn(img, 2.0))
    nulls = mutate.mutations(['pre', 'verify'], ['nav', 'caspr'], nulls=True)
    assert len(nulls) == mutate.NULLS * (3 + 4) and 'pre:null-0@nav+caspr' in nulls
