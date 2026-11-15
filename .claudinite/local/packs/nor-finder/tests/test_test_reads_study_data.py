"""The test-reads-study-data check, run by the engine on a violating tree and a clean one.

    python3 -m pytest .claudinite/local/packs/nor-finder/tests
"""
from test_async_wait_predicate import findings as found


def findings(tmp_path, files):
    return found(tmp_path, files, 'test-reads-study-data')


def test_a_path_into_a_studys_downloaded_data_is_found_in_a_python_and_a_page_test(tmp_path):
    assert findings(tmp_path, {
        'studies/x/tests/test_a.py': "import os\nTIF = os.path.join(HERE, '..', 'data', 'raw', 'slide.tif')\n",
        'studies/x/tests/b_driver.mjs': 'const img = "../data/raw/slide.tif";\n',
        'web-tests/c_driver.mjs': 'const img = `${root}/data/raw/z01.tif`;\n',
    }) == ['studies/x/tests/b_driver.mjs:1', 'studies/x/tests/test_a.py:2', 'web-tests/c_driver.mjs:1']


def test_a_drawn_image_a_scratch_raw_folder_a_comment_and_study_code_are_not(tmp_path):
    assert findings(tmp_path, {
        'studies/x/tests/test_a.py': ("raw = os.path.join(d, 'raw')\n"
                                      "img = nor_image(str(tmp_path / 'a.tif'))\n"
                                      '# the real slide lives in data/raw, which no test reads\n'),
        'studies/x/detection/fetch.py': "RAW = os.path.join(ROOT, 'data', 'raw')\n",
        'web-tests/c_driver.mjs': 'const raw = "metadata/rawness";\n',
    }) == []
