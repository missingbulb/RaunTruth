package checks

import (
	"path"
	"regexp"
	"strings"

	"claudinite.com/checksdk"
)

// The repo's test folders are not packages and no pytest config sets an import mode, so pytest imports each test
// module by its file name alone, and one run cannot collect two that share it. The vendored mount's tests run
// apart and are not counted.

func init() {
	checksdk.Register(checksdk.Check{
		ID:     "test-file-names-unique",
		Tags:   []string{"world"},
		OnFail: "block",
		Since:  "2026-11-20",
		Why:    "pytest imports a test module by its file name, so a second file of the same name stops collection with an import file mismatch",
		Run:    testBasenames,
	})
}

var pytestModule = regexp.MustCompile(`(^|/)(test_[^/]+|[^/]+_test)\.py$`)

func testBasenames(repo checksdk.Repo) []checksdk.Finding {
	byName := map[string][]string{}
	for _, f := range repo.Tracked() {
		if strings.HasPrefix(f, ".claudinite/") || !pytestModule.MatchString(f) {
			continue
		}
		byName[path.Base(f)] = append(byName[path.Base(f)], f)
	}
	var out []checksdk.Finding
	for _, files := range byName {
		if len(files) < 2 {
			continue
		}
		for _, f := range files {
			var others []string
			for _, o := range files {
				if o != f {
					others = append(others, o)
				}
			}
			out = append(out, checksdk.Finding{
				Path:     f,
				Sentence: "shares its file name with " + strings.Join(others, ", "),
				Fix:      "rename one after what it tests in its own study, e.g. test_<study>_" + strings.TrimPrefix(path.Base(f), "test_"),
			})
		}
	}
	return out
}
