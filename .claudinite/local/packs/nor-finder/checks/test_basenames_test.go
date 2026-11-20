package checks

import (
	"sort"
	"testing"

	"claudinite.com/checksdk"
)

func basenameFindings(t *testing.T, tracked ...string) []string {
	t.Helper()
	var out []string
	for _, f := range testBasenames((&checksdk.Fake{Tracked: tracked}).Repo(t.TempDir())) {
		out = append(out, f.Path+" "+f.Sentence)
	}
	sort.Strings(out)
	return out
}

func TestTwoTestFilesOfOneNameAreBothFound(t *testing.T) {
	got := basenameFindings(t,
		"studies/acme/tests/test_processing_box.py",
		"studies/nor/tests/test_processing_box.py",
		"web-tests/lab_test.py", "dev/tools/x/lab_test.py",
		"studies/nor/tests/test_nor.py")
	want(t, got,
		`^dev/tools/x/lab_test\.py .*web-tests/lab_test\.py`,
		`^studies/acme/tests/test_processing_box\.py .*studies/nor/tests/test_processing_box\.py`,
		`^studies/nor/tests/test_processing_box\.py .*studies/acme/tests/test_processing_box\.py`,
		`^web-tests/lab_test\.py .*dev/tools/x/lab_test\.py`,
	)
}

func TestConftestsTheVendoredMountAndOtherFilesAreNot(t *testing.T) {
	want(t, basenameFindings(t,
		"web-tests/conftest.py", "studies/nor/tests/conftest.py",
		".claudinite/local/packs/nor-finder/tests/test_nor.py", "studies/nor/tests/test_nor.py",
		"studies/a/web/helpers.py", "studies/b/web/helpers.py",
		"studies/a/tests/test_box.mjs", "studies/b/tests/test_box.mjs"))
}
