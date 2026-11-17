package checks

import (
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"testing"

	"claudinite.com/checksdk"
)

// pageImports is the check's findings, as path:line sentence, over files written under a fresh root.
func pageImports(t *testing.T, files map[string]string) []string {
	t.Helper()
	root := t.TempDir()
	var tracked []string
	for rel, text := range files {
		p := filepath.Join(root, filepath.FromSlash(rel))
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte(text), 0o644); err != nil {
			t.Fatal(err)
		}
		tracked = append(tracked, rel)
	}
	var out []string
	for _, f := range pagePythonImports((&checksdk.Fake{Tracked: tracked}).Repo(root)) {
		out = append(out, f.Path+":"+strconv.Itoa(f.Line)+" "+f.Sentence)
	}
	return out
}

const studyJSON = `{"python": {"paths": ["py/", "lab/"], "entry": "x", "packages": ["numpy", "scikit-image"], "wheels": ["tifffile==2026.3.3"]}}`

func want(t *testing.T, got []string, patterns ...string) {
	t.Helper()
	if len(got) != len(patterns) {
		t.Fatalf("got %d findings, want %d: %q", len(got), len(patterns), got)
	}
	for i, p := range patterns {
		if !regexp.MustCompile(p).MatchString(got[i]) {
			t.Errorf("finding %d is %q, want it to match %q", i, got[i], p)
		}
	}
}

func TestAnImportThePageDoesNotInstallIsFoundWhereverTheEntryReachesIt(t *testing.T) {
	got := pageImports(t, map[string]string{
		"studies/x/study.json": studyJSON,
		"studies/x/py/x.py":    "import json\nimport numpy as np\n\ndef go():\n    import helper\n",
		// a module in a later folder, reached only from inside a function: the page runs it when asked
		"studies/x/lab/helper.py": "from skimage import morphology\nimport matplotlib.pyplot as plt\n",
	})
	want(t, got, `^studies/x/lab/helper\.py:2 .*\bmatplotlib\b.*\bx$`)
}

func TestAPackageAWheelTheStandardLibraryAndPyodideItselfAreNotFound(t *testing.T) {
	got := pageImports(t, map[string]string{
		"studies/x/study.json": studyJSON,
		"studies/x/py/x.py": strings.Join([]string{
			`"""Usage:`,
			`import matplotlib  <- prose in a docstring imports nothing`,
			`"""`,
			`import os, sys`,
			`from collections import defaultdict`,
			`import tifffile`,
			`from skimage.morphology import skeletonize`,
			`# import gdown`,
			`from pyodide.ffi import to_js`,
			`import js`,
		}, "\n"),
	})
	want(t, got)
}

func TestAnImportMarkedNativeOnlyIsNeitherFollowedNorFound(t *testing.T) {
	got := pageImports(t, map[string]string{
		"studies/x/study.json": studyJSON,
		"studies/x/py/x.py": "def figure():\n    import render  # native only: the lab's figures, never asked for by the page\n" +
			"def fetch():\n    import gdown  # native only: downloads the raw stacks\n",
		"studies/x/py/render.py": "from PIL import Image\n",
	})
	want(t, got)
}

func TestAMissingEntryModuleIsFoundOnTheStudyJSON(t *testing.T) {
	got := pageImports(t, map[string]string{
		"studies/x/study.json":  studyJSON,
		"studies/x/py/other.py": "import matplotlib\n",
	})
	want(t, got, `^studies/x/study\.json:0 .*\bx\b`)
}

func TestAStudyWithNoPythonAndAModuleNoEntryReachesAreNotRead(t *testing.T) {
	got := pageImports(t, map[string]string{
		"studies/x/study.json":     studyJSON,
		"studies/x/py/x.py":        "import numpy\n",
		"studies/x/py/research.py": "import matplotlib\n",
		"studies/y/study.json":     `{"view": {}}`,
		"studies/y/py/y.py":        "import matplotlib\n",
	})
	want(t, got)
}
