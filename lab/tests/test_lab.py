"""The lab on the fixture study, against a stand-in Drive: fetching a study's images and its curated ground truth,
running and scoring every version, the metrics file it writes, and the speed pass's signature.

    python3 -m pytest lab
"""
import hashlib
import json
import os
import shutil
import struct
import sys
import zlib

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
import fetch  # noqa: E402
import perf  # noqa: E402
import run  # noqa: E402
import study as lab_study  # noqa: E402


def png(width, height, pixels):
    rows = b''.join(b'\0' + bytes(pixels[y * width:(y + 1) * width]) for y in range(height))
    chunk = lambda kind, body: struct.pack('>I', len(body)) + kind + body + struct.pack('>I', zlib.crc32(kind + body))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 0, 0, 0, 0)) + \
        chunk(b'IDAT', zlib.compress(rows)) + chunk(b'IEND', b'')


class StandInDrive:
    """Folders and files by id, as Drive answers a public listing; counts what it was asked."""

    def __init__(self, folders, files):
        self.folders, self.files, self.downloads = folders, files, []

    def list_folder(self, fid):
        return list(self.folders[fid])

    def download(self, fid, out):
        self.downloads.append(fid)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, 'wb').write(self.files[fid])


@pytest.fixture
def acme(tmp_path, monkeypatch):
    """The fixture study copied as `acme` under a scratch studies/, with two images on its stand-in Drive: ten bright
    pixels and twenty, ground truth for each (the second's in two taggers' files, the newer counting), and a third
    file with no image SHA-256."""
    studies = tmp_path / 'studies'
    shutil.copytree(os.path.join(lab_study.STUDIES, 'fixture'), studies / 'acme')
    m = json.load(open(studies / 'acme' / 'study.json'))
    m['root'] = 'https://drive.google.com/drive/folders/rootfolder00'
    json.dump(m, open(studies / 'acme' / 'study.json', 'w'))
    monkeypatch.setattr(lab_study, 'STUDIES', str(studies))
    monkeypatch.setattr(fetch, 'STUDIES', str(studies))
    ten, twenty = png(10, 10, [200] * 10 + [0] * 90), png(10, 10, [200] * 20 + [0] * 80)
    sha = lambda b: hashlib.sha256(b).hexdigest()
    doc = lambda img, count, created, tagger: json.dumps(dict(image=dict(name='x.png', sha256=sha(img)), created=created,
                                                              tagger=tagger, labels=[dict(count=count)])).encode()
    files = {'img10': ten, 'img20': twenty,
             'gt10': doc(ten, 10, '2026-11-01T00:00:00Z', 'a@x'),
             'gt20old': doc(twenty, 99, '2026-11-01T00:00:00Z', 'a@x'),
             'gt20new': doc(twenty, 18, '2026-11-02T00:00:00Z', 'b@x'),
             'bad': json.dumps(dict(created='2026-11-01T00:00:00Z')).encode(),
             'settings': json.dumps(dict(format='rauntruth-study/1', curated='curatedfold')).encode()}
    drive = StandInDrive({'rootfolder00': [('Data/ten.png', 'img10'), ('Data/twenty.png', 'img20'), ('rauntruth-study.json', 'settings')],
                          'curatedfold': [(f'ten__{sha(ten)[:8]}/gt_a@x.json', 'gt10'), (f'twenty__{sha(twenty)[:8]}/gt_a@x.json', 'gt20old'),
                                          (f'twenty__{sha(twenty)[:8]}/gt_b@x.json', 'gt20new'), ('odd__00000000/gt_c@x.json', 'bad')]}, files)
    fetch.images('acme', drive, pin=True)
    return lab_study.Study('acme'), drive


def test_pinning_records_every_image_of_the_data_folder_with_its_sha256(acme):
    s, drive = acme
    entries = json.load(open(os.path.join(s.dir, 'data', 'sources.json')))['images']
    assert [(e['path'], e['drive_id']) for e in entries] == [('ten.png', 'img10'), ('twenty.png', 'img20')]
    assert all(len(e['sha256']) == 64 for e in entries)
    drive.downloads.clear()
    fetch.images('acme', drive)
    assert drive.downloads == [], 'an image fetched before is verified, not fetched again'


def test_an_image_changed_on_drive_is_refused(acme):
    s, drive = acme
    path = fetch.image_path(s.data, dict(path='ten.png', drive_id='img10'))
    open(path, 'ab').write(b'x')
    with pytest.raises(fetch.ChecksumMismatch):
        fetch.images('acme', drive)


def test_each_image_s_newest_curated_file_is_its_ground_truth_and_a_file_naming_no_image_is_refused(acme):
    s, drive = acme
    kept, refused = fetch.truth('acme', drive)
    assert sorted(t['doc']['labels'][0]['count'] for t in kept) == [10, 18]
    assert list(refused.values()) == ['no image SHA-256']


def test_a_full_listing_stops_the_fetch(acme):
    s, drive = acme
    drive.folders['curatedfold'] = [(f'img{i}__00000000/gt_a@x.json', 'gt10') for i in range(fetch.LISTING_MAX)]
    with pytest.raises(fetch.ListingFull):
        fetch.truth('acme', drive)


def test_every_version_is_scored_by_the_study_s_own_scorer_and_summed(acme):
    s, drive = acme
    results, pairs = run.measure(s, transport=drive)
    assert len(pairs) == 2
    # above 128: 10 and 20 pixels counted against 10 and 18 marked
    assert {k: results['above'][None][k] for k in ('tp', 'fp', 'fn', 'precision', 'recall')} == \
        dict(tp=28, fp=2, fn=0, precision=round(28 / 30, 4), recall=1.0)


def test_the_metrics_file_carries_the_numbers_what_they_were_measured_on_and_how_they_were_scored(acme):
    s, drive = acme
    results, pairs = run.measure(s, transport=drive)
    doc = run.document(s, results, pairs)
    assert doc['scoring'] == s.module.SCORING
    assert doc['measured'] == 'on 2 images with ground truth'
    assert sorted(i['truth'] for i in doc['images']) == sorted(t['subfolder'] for _, t in pairs)
    assert doc['versions']['from']['recall'] == 1.0 and set(doc['versions']) == set(s.versions)
    assert doc['dataset_sha256'] == run.dataset_sha(list(reversed(pairs))), 'the data set is named by its files, in any order'


def test_an_answer_is_run_again_only_when_the_study_s_code_changes(acme):
    s, drive = acme
    run.measure(s, ['above'], transport=drive)
    cached = os.listdir(os.path.join(s.data, 'runs', 'above'))
    run.measure(s, ['above'], transport=drive)
    assert os.listdir(os.path.join(s.data, 'runs', 'above')) == cached
    open(os.path.join(s.paths[0], 'fixture.py'), 'a').write('\n# changed\n')
    run.measure(s, ['above'], transport=drive)
    assert len(os.listdir(os.path.join(s.data, 'runs', 'above'))) == 2 * len(cached)


def test_a_version_asking_for_a_service_is_answered_and_one_asking_for_none_served_fails():
    def asks(image):
        got = yield ('say', image)
        return got + '!'
    assert lab_study.drive(asks('hi'), {'say': lambda x: x.upper()}) == 'HI!'
    with pytest.raises(RuntimeError, match="'say'"):
        lab_study.drive(asks('hi'), {})
    assert lab_study.drive(dict(plain=1), {}) == dict(plain=1)


def test_the_speed_pass_signature_sees_an_array_s_bytes_and_ignores_the_time_taken():
    import numpy as np
    a = dict(mask=np.zeros(4, np.uint8), seconds=1.0, n=1)
    assert perf.signature(a) == perf.signature(dict(a, seconds=9.0))
    assert perf.signature(a) != perf.signature(dict(a, mask=np.array([0, 0, 1, 0], np.uint8)))
    assert perf.signature(a) != perf.signature(dict(a, mask=np.zeros(4, np.int16)))


def test_two_ground_truth_files_on_one_image_are_both_scored(acme, tmp_path):
    s, drive = acme
    _, pairs = run.measure(s, transport=drive)
    img = pairs[0][1]['doc']['image']
    os.makedirs(os.path.join(s.dir, 'lab', 'truth'))
    json.dump(dict(image=img, created='2026-11-03T00:00:00Z', labels=[dict(count=5)]), open(os.path.join(s.dir, 'lab', 'truth', 'own.json'), 'w'))
    results, pairs = run.measure(s, ['above'], transport=drive)
    assert len(pairs) == 3 and len(results['above'][None]['images']) == 3
    assert len(run.document(s, results, pairs)['versions']['above']['truths']) == 3
