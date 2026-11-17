package checks

import (
	"encoding/json"
	"fmt"
	"path"
	"regexp"
	"strings"

	"claudinite.com/checksdk"
)

// What the page's Python can import is what its study.json installs: a module from the study's python.paths, the
// standard library, Pyodide's own modules, and the packages and wheels it names. The check walks every module the
// entry reaches, an import inside a function included, since the page runs whichever function an action calls. An
// import ending `# native only: <reason>` is the boundary of what the page runs: it is neither followed nor
// judged. A module named only at run time (importlib.import_module) is not followed.

func init() {
	checksdk.Register(checksdk.Check{
		ID:     "page-python-imports",
		Tags:   []string{"world"},
		OnFail: "block",
		Since:  "2026-11-17",
		Why:    "the page installs only what a study's study.json names, so an import it does not name fails as an ImportError in the browser alone, the first time a person asks for the action that reaches it",
		Run:    pagePythonImports,
	})
}

// a study.json's python
type pagePython struct {
	Paths    []string `json:"paths"`
	Entry    string   `json:"entry"`
	Packages []string `json:"packages"`
	Wheels   []string `json:"wheels"`
}

// the import name of a distribution whose import name is not its own name with - as _
var pageImportName = map[string]string{"scikit-image": "skimage", "pillow": "PIL", "pillow-heif": "pillow_heif"}

// Pyodide's own modules, which every study's Python has
var pagePyodideModules = []string{"pyodide", "pyodide_js", "js", "micropip"}

// sys.stdlib_module_names of CPython 3.13.18, its private modules left out but __future__
const pageStdlib = `
__future__ abc antigravity argparse array ast asyncio atexit base64 bdb binascii bisect builtins bz2 cProfile
calendar cmath cmd code codecs codeop collections colorsys compileall concurrent configparser contextlib
contextvars copy copyreg csv ctypes curses dataclasses datetime dbm decimal difflib dis doctest email
encodings ensurepip enum errno faulthandler fcntl filecmp fileinput fnmatch fractions ftplib functools gc
genericpath getopt getpass gettext glob graphlib grp gzip hashlib heapq hmac html http idlelib imaplib
importlib inspect io ipaddress itertools json keyword linecache locale logging lzma mailbox marshal math
mimetypes mmap modulefinder msvcrt multiprocessing netrc nt ntpath nturl2path numbers opcode operator optparse
os pathlib pdb pickle pickletools pkgutil platform plistlib poplib posix posixpath pprint profile pstats pty
pwd py_compile pyclbr pydoc pydoc_data pyexpat queue quopri random re readline reprlib resource rlcompleter
runpy sched secrets select selectors shelve shlex shutil signal site smtplib socket socketserver sqlite3
sre_compile sre_constants sre_parse ssl stat statistics string stringprep struct subprocess symtable sys
sysconfig syslog tabnanny tarfile tempfile termios textwrap this threading time timeit tkinter token tokenize
tomllib trace traceback tracemalloc tty turtle turtledemo types typing unicodedata unittest urllib uuid venv
warnings wave weakref webbrowser winreg winsound wsgiref xml xmlrpc zipapp zipfile zipimport zlib zoneinfo
`

var (
	pageStudyJSON  = regexp.MustCompile(`^studies/[^/]+/study\.json$`)
	pageImportLine = regexp.MustCompile(`^\s*import\s+([\w.]+(?:\s+as\s+\w+)?(?:\s*,\s*[\w.]+(?:\s+as\s+\w+)?)*)`)
	pageFromLine   = regexp.MustCompile(`^\s*from\s+([\w.]+)\s+import\b`)
	pageNativeOnly = regexp.MustCompile(`#\s*native only:\s*\S`)
)

func pagePythonImports(repo checksdk.Repo) []checksdk.Finding {
	known := map[string]bool{}
	for _, n := range strings.Fields(pageStdlib) {
		known[n] = true
	}
	for _, n := range pagePyodideModules {
		known[n] = true
	}
	var out []checksdk.Finding
	for _, sj := range repo.Tracked() {
		if !pageStudyJSON.MatchString(sj) {
			continue
		}
		text, ok := repo.Read(sj)
		if !ok {
			continue
		}
		var d struct{ Python *pagePython }
		if json.Unmarshal([]byte(text), &d) != nil || d.Python == nil {
			continue
		}
		out = append(out, pageStudyImports(repo, sj, *d.Python, known)...)
	}
	return out
}

func pageStudyImports(repo checksdk.Repo, sj string, py pagePython, std map[string]bool) []checksdk.Finding {
	dir, study := path.Dir(sj), path.Base(path.Dir(sj))
	installed := map[string]bool{}
	for _, p := range py.Packages {
		installed[pageImportOf(p)] = true
	}
	for _, w := range py.Wheels {
		installed[pageImportOf(strings.SplitN(w, "==", 2)[0])] = true
	}
	// the file a module name imports, from the first of the study's folders holding it, as the page's importer does
	find := func(name string) string {
		for _, p := range py.Paths {
			f := path.Join(dir, p, name+".py")
			if repo.Exists(f) {
				return f
			}
		}
		return ""
	}
	if find(py.Entry) == "" {
		return []checksdk.Finding{{Path: sj, Sentence: fmt.Sprintf("names the entry module %s, which none of its python.paths holds", py.Entry),
			Fix: "name a module in one of the study's python.paths, or add the folder that holds it"}}
	}
	var out []checksdk.Finding
	seen, todo := map[string]bool{py.Entry: true}, []string{py.Entry}
	for len(todo) > 0 {
		f := find(todo[0])
		todo = todo[1:]
		text, _ := repo.Read(f)
		for i, line := range strings.Split(pagePythonCode(text), "\n") {
			if pageNativeOnly.MatchString(line) {
				continue
			}
			for _, name := range pageImported(line) {
				switch {
				case find(name) != "":
					if !seen[name] {
						seen[name] = true
						todo = append(todo, name)
					}
				case std[name] || installed[name]:
				default:
					out = append(out, checksdk.Finding{Path: f, Line: i + 1,
						Sentence: fmt.Sprintf("imports %s, which the page does not install for %s", name, study),
						Fix:      fmt.Sprintf("add its package to %s's python.packages or python.wheels, or, where the page never runs it, end the line `# native only: <reason>`", sj)})
				}
			}
		}
	}
	return out
}

func pageImportOf(dist string) string {
	if n, ok := pageImportName[strings.ToLower(dist)]; ok {
		return n
	}
	return strings.ReplaceAll(dist, "-", "_")
}

// the top-level module names an import statement on line imports; none for a relative import
func pageImported(line string) []string {
	if m := pageFromLine.FindStringSubmatch(line); m != nil {
		return []string{strings.SplitN(m[1], ".", 2)[0]}
	}
	m := pageImportLine.FindStringSubmatch(line)
	if m == nil {
		return nil
	}
	var names []string
	for _, part := range strings.Split(m[1], ",") {
		names = append(names, strings.SplitN(strings.Fields(part)[0], ".", 2)[0])
	}
	return names
}

// text with every string literal blanked and each comment kept, newlines kept, so a docstring quoting an import
// imports nothing, a commented-out import stays one, and the native-only marker is still read
func pagePythonCode(text string) string {
	var b strings.Builder
	for i := 0; i < len(text); {
		c := text[i]
		switch {
		case c == '#':
			for i < len(text) && text[i] != '\n' {
				b.WriteByte(text[i])
				i++
			}
		case c == '"' || c == '\'':
			q := string(c)
			if strings.HasPrefix(text[i:], q+q+q) {
				q = q + q + q
			}
			b.WriteString(strings.Repeat("_", len(q)))
			i += len(q)
			for i < len(text) && !strings.HasPrefix(text[i:], q) {
				if text[i] == '\\' && i+1 < len(text) {
					b.WriteString(pageBlank(text[i : i+2]))
					i += 2
					continue
				}
				if len(q) == 1 && text[i] == '\n' {
					break
				}
				b.WriteString(pageBlank(text[i : i+1]))
				i++
			}
			if strings.HasPrefix(text[i:], q) {
				b.WriteString(strings.Repeat("_", len(q)))
				i += len(q)
			}
		default:
			b.WriteByte(c)
			i++
		}
	}
	return b.String()
}

func pageBlank(s string) string {
	return strings.Map(func(r rune) rune {
		if r == '\n' {
			return r
		}
		return '_'
	}, s)
}
