"""The literature-summaries-only check, run by the engine on a violating tree and a clean one.

    python3 -m pytest .claudinite/local/packs/nor-finder/tests
"""
from test_async_wait_predicate import findings as found


def findings(tmp_path, files):
    return found(tmp_path, files, 'literature-summaries-only')


def test_a_pdf_a_figure_and_a_script_are_found_at_any_depth(tmp_path):
    assert findings(tmp_path, {
        'studies/acme/docs/literature/smith-2020-a.pdf': '%PDF-1.7\n',
        'studies/acme/docs/literature/fig1.png': 'png\n',
        'studies/other/docs/literature/jones-2021-b/crop_panels.py': 'print(1)\n',
    }) == ['studies/acme/docs/literature/fig1.png', 'studies/acme/docs/literature/smith-2020-a.pdf',
           'studies/other/docs/literature/jones-2021-b/crop_panels.py']


def test_markdown_and_images_outside_the_literature_folder_are_not(tmp_path):
    assert findings(tmp_path, {
        'studies/acme/docs/literature/README.md': '# Papers\n',
        'studies/acme/docs/literature/smith-2020-a.md': '# Smith\n',
        'studies/acme/docs/literature/topics/spines.md': '# Spines\n',
        'studies/acme/docs/figure.png': 'png\n',
        'studies/acme/web/poster.jpg': 'jpg\n',
    }) == []
