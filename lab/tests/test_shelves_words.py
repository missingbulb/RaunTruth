"""The Bookshelf Reader's word list of names (lab/shelves_words.py): the file the page and the lab spell by is the one
the tool writes, its header naming the dated dump and its checksum, and none of its words on the subtitle list's
lines it was made beside."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import shelves_words


def test_the_names_file_is_the_tools_own_output():
    text = open(shelves_words.OUT, encoding='utf8').read()
    assert text.startswith(shelves_words.HEADER), 'regenerate it: python3 lab/shelves_words.py'
    words = text[len(shelves_words.HEADER):].split('\n')
    assert len(words) > 1000 and all(w and not w.startswith('#') for w in words[:-1])
