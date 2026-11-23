"""The lab on the fixture study, against a stand-in Drive: fetching a study's images and its GT marks through its study
file, running and scoring every version, the metrics file it writes, and the speed pass's signature.

    python3 -m pytest lab
"""
import glob
import hashlib
import json
import os
import shutil
import struct
import subprocess
import sys
import zlib

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
import fetch
import freeze
import perf
import run
import stage as lab_stage
import study as lab_study


def png(width, height, pixels):
    rows = b''.join(b'\0' + bytes(pixels[y * width:(y + 1) * width]) for y in range(height))
    chunk = lambda kind, body: struct.pack('>I', len(body)) + kind + body + struct.pack('>I', zlib.crc32(kind + body))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 0, 0, 0, 0)) + \
        chunk(b'IDAT', zlib.compress(rows)) + chunk(b'IEND', b'')


class StandInDrive:
    """Files by id, as Drive answers a link-shared download; counts what it was asked."""

    def __init__(self, files):
        self.files, self.downloads = files, []

    def download(self, fid, out):
        self.downloads.append(fid)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, 'wb').write(self.files[fid])


STUDY_FILE_ID = 'studyfileid-unique'
sha = lambda b: hashlib.sha256(b).hexdigest()
TEN, TWENTY = png(10, 10, [200] * 10 + [0] * 90), png(10, 10, [200] * 20 + [0] * 80)


def extraction(img, count, created='2026-11-01T00:00:00Z', tagger='a@x'):
    return json.dumps(dict(image=dict(name='x.png', sha256=sha(img), drive_id='imgid-private'), created=created, tagger=tagger,
                           history=dict(actions=[dict(type='run', by=tagger)]), labels=[dict(count=count)])).encode()


def put_study_file(drive, **changes):
    doc = dict(format='rauntruth-study/2', stage='Develop',
               index=dict(folders=[], images=[dict(id='imgdrive-ten', name='ten.png', folder='f', path=['Data'], sha=sha(TEN)),
                                              dict(id='imgdrive-twenty', name='twenty.png', folder='f', path=['Data'], sha=sha(TWENTY))]),
               marks={sha(TEN): dict(gt=dict(file='gtdrive-ten', by='a@x')),
                      sha(TWENTY): dict(gt=dict(file='gtdrive-twenty', by='b@x'), official=dict(file='officialdrive-twenty', by='a@x'))})
    doc.update(changes)
    drive.files[STUDY_FILE_ID] = json.dumps({k: v for k, v in doc.items() if v is not None}).encode()


@pytest.fixture
def acme(tmp_path, monkeypatch):
    """The fixture study copied as `acme` under a scratch studies/, with two images and their marks on a stand-in Drive
    that holds only what the study file names: ten bright pixels and twenty; the second's GT is the count of 18, its
    official mark a file of 99 that is never scored."""
    studies = tmp_path / 'studies'
    shutil.copytree(os.path.join(lab_study.STUDIES, 'fixture'), studies / 'acme')
    monkeypatch.setattr(lab_study, 'STUDIES', str(studies))
    monkeypatch.setattr(fetch, 'STUDIES', str(studies))
    monkeypatch.setenv('RAUNTRUTH_STUDY_ACME', STUDY_FILE_ID)
    drive = StandInDrive({'imgdrive-ten': TEN, 'imgdrive-twenty': TWENTY,
                          'gtdrive-ten': extraction(TEN, 10),
                          'gtdrive-twenty': extraction(TWENTY, 18, '2026-11-02T00:00:00Z', 'b@x'),
                          'officialdrive-twenty': extraction(TWENTY, 99)})
    put_study_file(drive)
    fetch.images('acme', drive, pin=True)
    return lab_study.Study('acme'), drive


def test_pinning_records_the_study_file_s_images_by_name_and_hash_alone(acme):
    s, drive = acme
    entries = json.load(open(os.path.join(s.dir, 'data', 'sources.json')))['images']
    assert [(e['path'], e['sha256']) for e in entries] == [('ten.png', sha(TEN)), ('twenty.png', sha(TWENTY))]
    assert all(set(e) == {'path', 'sha256'} for e in entries)
    drive.downloads.clear()
    fetch.images('acme', drive)
    assert drive.downloads == [STUDY_FILE_ID], 'an image fetched before is verified, not fetched again'


def test_an_image_changed_on_drive_is_refused(acme):
    s, drive = acme
    path = fetch.image_path(s.data, dict(path='ten.png', sha256=sha(TEN)))
    open(path, 'ab').write(b'x')
    with pytest.raises(fetch.ChecksumMismatch):
        fetch.images('acme', drive)


def test_fetch_downloads_exactly_the_files_the_study_file_names_and_prints_no_drive_id(acme, capsys):
    s, drive = acme
    shutil.rmtree(s.data)
    drive.downloads.clear()
    fetch.main(['acme'], drive)
    assert sorted(drive.downloads) == sorted([STUDY_FILE_ID, 'imgdrive-ten', 'imgdrive-twenty', 'gtdrive-ten', 'gtdrive-twenty'])
    seen = capsys.readouterr()
    assert not any(i in seen.out + seen.err for i in ('unique', 'imgdrive', 'gtdrive'))
    assert 'stage: develop' in seen.out


def test_without_the_study_file_s_variable_the_lab_stops_with_exit_2_naming_it(acme, monkeypatch, capsys):
    s, drive = acme
    monkeypatch.delenv('RAUNTRUTH_STUDY_ACME')
    with pytest.raises(SystemExit) as stop:
        fetch.main(['acme'], drive)
    assert stop.value.code == 2
    seen = capsys.readouterr()
    assert 'RAUNTRUTH_STUDY_ACME' in seen.err and 'unique' not in seen.out + seen.err


def test_the_ground_truth_is_the_gt_marks_alone_and_a_mark_naming_another_image_is_refused(acme):
    s, drive = acme
    kept, refused = fetch.truth('acme', drive)
    assert sorted(t['doc']['labels'][0]['count'] for t in kept) == [10, 18] and refused == {}
    assert 'officialdrive-twenty' not in drive.downloads
    drive.files['gtdrive-ten'] = extraction(TWENTY, 10)
    kept, refused = fetch.truth('acme', drive)
    assert [t['doc']['labels'][0]['count'] for t in kept] == [18]
    assert len(refused) == 1


def test_a_mark_follows_its_file_s_latest_content(acme):
    s, drive = acme
    first, _ = run.measure(s, ['above'], transport=drive)
    assert first['above'][None]['fp'] == 2
    drive.files['gtdrive-twenty'] = extraction(TWENTY, 20, '2026-11-09T00:00:00Z', 'b@x')
    second, _ = run.measure(s, ['above'], transport=drive)
    assert second['above'][None]['fp'] == 0


def test_the_dataset_sha_ignores_what_the_model_does_not_hold(acme):
    s, drive = acme
    _, pairs = run.measure(s, ['above'], transport=drive)
    before = run.dataset_sha(pairs)
    drive.files['gtdrive-ten'] = extraction(TEN, 10, '2027-01-01T00:00:00Z', 'someone-else@x')
    _, pairs = run.measure(s, ['above'], transport=drive)
    assert run.dataset_sha(pairs) == before
    drive.files['gtdrive-ten'] = extraction(TEN, 11)
    _, pairs = run.measure(s, ['above'], transport=drive)
    assert run.dataset_sha(pairs) != before


def test_the_model_only_form_holds_no_history_tagger_creation_time_or_email():
    doc = json.loads(extraction(TEN, 10))
    doc['labels'][0]['note'] = dict(email='a@x', kept=1)
    only = json.dumps(fetch.model_only(doc))
    assert not any(k in only for k in ('history', 'tagger', 'created', 'a@x', 'imgid-private'))
    assert fetch.model_only(doc)['labels'] == [dict(count=10, note=dict(kept=1))]


def test_run_write_stops_in_review_and_public_and_runs_in_develop_and_with_no_stage(acme, monkeypatch, capsys):
    s, drive = acme
    monkeypatch.setattr(fetch, 'GoogleDrive', lambda: drive)
    before = open(s.metrics_path(), 'rb').read()
    for stage in ('Review', 'public'):
        put_study_file(drive, stage=stage)
        with pytest.raises(SystemExit, match='frozen'):
            run.main(['acme', '--write'])
        assert open(s.metrics_path(), 'rb').read() == before, 'the frozen study\'s metrics file is left as it was'
    for stage in ('Develop', None):
        put_study_file(drive, stage=stage)
        run.main(['acme', '--write'])
        said = capsys.readouterr().out
        assert 'wrote ' in said
    assert 'stage: unknown' in said


def test_the_stage_command_says_the_stage_and_stops_an_unattended_run_when_frozen(acme, capsys):
    s, drive = acme
    stages = ('Setup', 'Develop', 'Analyze', 'Review', 'Public', None)
    codes, said = [], {}
    for stage in stages:
        put_study_file(drive, stage=stage)
        codes.append(lab_stage.main(['acme', '--stop-if-frozen'], drive))
        said[stage] = capsys.readouterr().out
    assert codes == [0, 0, 0, 3, 3, 0]
    assert 'frozen' in said['Review'] and 'unknown' in said[None]


def test_no_study_s_sources_name_a_drive_id():
    manifests = glob.glob(os.path.join(lab_study.ROOT, 'studies', '*', 'data', 'sources.json'))
    assert len(manifests) >= 3
    for path in manifests:
        assert all('drive_id' not in e for e in json.load(open(path))['images']), path


def test_the_mutation_sweep_task_stops_clean_when_the_study_is_frozen(tmp_path):
    # the task's worker under node, against a stub of the SDK it imports and a stub lab/stage.py giving each exit
    if not shutil.which('node'):
        pytest.skip('node is not installed')
    task = os.path.join(lab_study.ROOT, '.claudinite', 'local', 'packs', 'nor-study', 'tasks', 'mutation-sweep')
    work = tmp_path / 'work'
    sdk = work / 'node_modules' / '@claudinite' / 'sdk'
    sdk.mkdir(parents=True)
    (sdk / 'package.json').write_text('{"name":"@claudinite/sdk","type":"module","main":"index.js"}')
    (sdk / 'index.js').write_text(
        'export const requestAgent = (x) => ({ agent: x });\n'
        'export const fail = (kind, message) => { throw Object.assign(new Error(message), { kind }); };\n')
    (work / 'package.json').write_text('{"type":"module"}')
    shutil.copy(os.path.join(task, 'worker.mjs'), work / 'worker.mjs')
    (work / 'repo' / 'lab').mkdir(parents=True)

    def worker_says(code, out='', err=''):
        (work / 'repo' / 'lab' / 'stage.py').write_text(
            f'import sys\nprint({out!r})\nprint({err!r}, file=sys.stderr)\nsys.exit({code})\n')
        script = ('import { worker } from "./worker.mjs";'
                  f'const logs = []; const r = await worker({{ root: {str(work / "repo")!r}, log: (m) => logs.push(m) }});'
                  'console.log(JSON.stringify({ r: r ?? null, logs }));')
        return subprocess.run(['node', '--input-type=module', '-e', script], cwd=work, capture_output=True, text=True)

    frozen = worker_says(3, 'the study is in Review, so its ground truth and scores are frozen')
    assert frozen.returncode == 0, frozen.stderr
    assert json.loads(frozen.stdout)['r'] is None and 'frozen' in frozen.stdout
    open_ = worker_says(0, 'stage: develop')
    assert open_.returncode == 0 and 'agent' in json.loads(open_.stdout)['r']
    unset = worker_says(2, '', 'RAUNTRUTH_STUDY_NOR is not set')
    assert unset.returncode == 0 and 'agent' in json.loads(unset.stdout)['r'], 'the agent session holds the variable'
    broken = worker_says(1, '', 'Traceback')
    assert broken.returncode != 0 and 'Traceback' in broken.stderr


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
    assert not any(i in json.dumps(doc) for i in ('drive', 'a@x', 'b@x'))


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


def test_a_version_asking_for_a_service_is_served_by_the_run_s_services_while_they_are_still_empty():
    class Lazy(dict):
        def __missing__(self, name):
            self[name] = lambda x: x * 2
            return self[name]

    def asks(image):
        return (yield ('double', image))
    s = lab_study.Study.__new__(lab_study.Study)
    s.module = type('m', (), {'VERSIONS': {'asks': asks}})
    assert s.run('asks', 21, Lazy()) == 42


def test_only_the_images_with_ground_truth_are_downloaded(acme):
    s, drive = acme
    put_study_file(drive, marks={sha(TEN): dict(gt=dict(file='gtdrive-ten', by='a@x'))})
    for f in os.listdir(os.path.join(s.data, 'images')):
        os.remove(os.path.join(s.data, 'images', f))
    drive.downloads.clear()
    _, pairs = run.measure(s, transport=drive)
    assert len(pairs) == 1 and 'imgdrive-twenty' not in drive.downloads and 'imgdrive-ten' in drive.downloads


AREA = [[[0, 0], [5, 0], [5, 1], [0, 1]]]


def tagged(drive, damaged):
    """The stand-in Drive's study file with these damaged areas in its tags, by image Drive id."""
    put_study_file(drive, tags=dict(images={k: dict(damaged=v) for k, v in damaged.items()}, folders={}))


def test_the_damaged_areas_of_the_study_file_s_tags_reach_the_versions(acme):
    # req/shell/data/damaged: half of the ten bright pixels lie in a damaged area, so `above` counts five of them
    s, drive = acme
    tagged(drive, {'imgdrive-ten': AREA})
    results, _ = run.measure(s, ['above'], transport=drive)
    assert {k: results['above'][None][k] for k in ('tp', 'fp', 'fn')} == dict(tp=23, fp=2, fn=5)


def test_an_answer_is_run_again_when_its_image_s_damaged_areas_change(acme):
    s, drive = acme
    run.measure(s, ['above'], transport=drive)
    cached = os.listdir(os.path.join(s.data, 'runs', 'above'))
    tagged(drive, {'imgdrive-ten': AREA})
    run.measure(s, ['above'], transport=drive)
    assert len(os.listdir(os.path.join(s.data, 'runs', 'above'))) == len(cached) + 1


def test_the_damaged_areas_reach_a_scorer_that_takes_them(acme, monkeypatch):
    s, drive = acme
    tagged(drive, {'imgdrive-twenty': AREA})
    seen = []
    monkeypatch.setattr(s.module, 'score', lambda answer, truth, damaged=(): seen.append(damaged) or dict(tp=0, fp=0, fn=0))
    run.measure(s, ['above'], transport=drive)
    assert sorted(seen, key=len) == [[], AREA]


FROZEN_ON = '2026-11-23'


def started_from(img, count, algorithm, code, note=None):
    """An extraction whose history begins with a run of the algorithm, as the page's saves do."""
    doc = json.loads(extraction(img, count))
    doc['history'] = dict(actions=[dict(type='run', algorithm=algorithm, version=dict(site='1.0', code=code), output={}),
                                   dict(type='delete-mark', mark='m1')])
    doc['labels'][0]['note'] = note
    return json.dumps(doc).encode()


@pytest.fixture
def reviewing(acme):
    """The acme study in Review, its two GT files each begun by a run of `above`."""
    s, drive = acme
    drive.files['gtdrive-ten'] = started_from(TEN, 10, 'above', 'abcdef0123456789')
    drive.files['gtdrive-twenty'] = started_from(TWENTY, 18, 'above', 'abcdef0123456789')
    put_study_file(drive, stage='Review')
    return s, drive


def gt_dir(s, date=FROZEN_ON):
    return os.path.join(s.dir, 'gt', date)


def test_the_freeze_is_the_freeze_of_review_alone(acme):
    # req/lab/freeze
    s, drive = acme
    for stage in ('Setup', 'Develop', 'Analyze', 'Public', None):
        put_study_file(drive, stage=stage)
        with pytest.raises(SystemExit, match='Review'):
            freeze.main(['acme'], drive, today=FROZEN_ON)
    assert not os.path.exists(os.path.join(s.dir, 'gt'))


def test_the_freeze_commits_one_model_only_file_per_gt_mark_and_no_official_one(reviewing):
    s, drive = reviewing
    freeze.main(['acme'], drive, today=FROZEN_ON)
    assert sorted(os.listdir(gt_dir(s))) == sorted([sha(TEN) + '.json', sha(TWENTY) + '.json'])
    for name in os.listdir(gt_dir(s)):
        text = open(os.path.join(gt_dir(s), name)).read()
        assert not any(w in text for w in ('history', 'tagger', 'created', 'a@x', 'b@x', 'imgid-private', 'drive_id')), name
        assert json.loads(text)['image']['sha256'] == name[:-5]
    assert 'officialdrive-twenty' not in drive.downloads


def test_the_freeze_publishes_the_scores_with_their_stamp_measured_on_the_committed_files(reviewing):
    s, drive = reviewing
    freeze.main(['acme'], drive, today=FROZEN_ON)
    doc = json.load(open(s.metrics_path()))
    committed = [json.load(open(os.path.join(gt_dir(s), n))) for n in sorted(os.listdir(gt_dir(s)))]
    assert doc['dataset_sha256'] == hashlib.sha256(json.dumps(sorted(
        [[i['image_sha256'], i['truth_sha256']] for i in doc['images']])).encode()).hexdigest()
    assert sorted(i['truth_sha256'] for i in doc['images']) == sorted(fetch.model_sha256(c) for c in committed), \
        'the dataset SHA names the committed files: Drive\'s copy and the repo\'s agree'
    for key, v in doc['versions'].items():
        assert v['stamp'] == dict(version=key, dataset_sha256=doc['dataset_sha256'], frozen=FROZEN_ON, commit=None)
    assert doc['versions']['above']['tp'] == 28 and doc['versions']['above']['fp'] == 2
    assert doc['frozen'] == FROZEN_ON
    assert not any(w in json.dumps(doc) for w in ('a@x', 'b@x', 'drive'))


def test_the_metrics_record_which_algorithm_version_each_gt_file_started_from(reviewing):
    s, drive = reviewing
    drive.files['gtdrive-twenty'] = extraction(TWENTY, 18)
    freeze.main(['acme'], drive, today=FROZEN_ON)
    started = {i['image_sha256']: i['started_from'] for i in json.load(open(s.metrics_path()))['images']}
    assert started == {sha(TEN): dict(algorithm='above', code='abcdef0123456789'), sha(TWENTY): None}


def test_the_freeze_refuses_to_commit_an_email_address_it_finds_in_a_file(reviewing):
    s, drive = reviewing
    drive.files['gtdrive-ten'] = started_from(TEN, 10, 'above', 'abcdef0123456789', note='ask who@lab.example')
    with pytest.raises(SystemExit, match='email'):
        freeze.main(['acme'], drive, today=FROZEN_ON)
    assert not os.path.exists(os.path.join(s.dir, 'gt'))


def test_the_stamp_step_names_the_commit_that_holds_the_files_and_waits_for_there_to_be_one(reviewing):
    s, drive = reviewing
    before = open(s.metrics_path(), 'rb').read()
    with pytest.raises(SystemExit, match='no freeze'):
        freeze.stamp('acme', commit_of=lambda path: 'abc')
    freeze.main(['acme'], drive, today=FROZEN_ON)
    with pytest.raises(SystemExit, match='not committed'):
        freeze.stamp('acme', commit_of=lambda path: None)
    asked = []
    freeze.stamp('acme', commit_of=lambda path: asked.append(path) or 'c0ffee' * 6 + 'abcd')
    doc = json.load(open(s.metrics_path()))
    assert all(v['stamp']['commit'] == 'c0ffee' * 6 + 'abcd' for v in doc['versions'].values()) and doc['commit'] == 'c0ffee' * 6 + 'abcd'
    assert [os.path.relpath(p, s.dir) for p in asked] == [os.path.join('gt', FROZEN_ON)]
    assert open(s.metrics_path(), 'rb').read() != before


def test_a_frozen_nor_file_still_counts_its_rejected_candidate_as_a_known_non_nor():
    sys.path.insert(0, os.path.join(lab_study.STUDIES, 'nor', 'tests'))
    import test_truth as nor_truth
    nor = lab_study.Study('nor')
    doc = nor_truth.three(deleted=[(300, 300)])
    with_reject = fetch.model_form(doc, nor.module)
    assert 'history' not in with_reject
    elements, _ = nor.module.truth_of(with_reject)
    assert sorted(e['state'] for e in elements).count('not') == 1
    without = fetch.model_form(nor_truth.three(), nor.module)
    assert fetch.model_sha256(with_reject) != fetch.model_sha256(without), 'the dataset SHA covers the rejects'
    assert fetch.model_form(with_reject, nor.module) == with_reject, 'the committed form, read again, is itself'
