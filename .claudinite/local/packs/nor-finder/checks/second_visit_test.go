package checks

import (
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"strconv"
	"testing"

	"claudinite.com/checksdk"
)

// visitFindings is the check's findings, as path:line, over files written under a fresh root.
func visitFindings(t *testing.T, files map[string]string) []string {
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
	out := []string{}
	for _, f := range secondVisits((&checksdk.Fake{Tracked: tracked}).Repo(root)) {
		out = append(out, f.Path+":"+strconv.Itoa(f.Line))
	}
	sort.Strings(out)
	return out
}

func TestAReloadAndASecondTabOnTheSameContextAreFound(t *testing.T) {
	got := visitFindings(t, map[string]string{
		"web-tests/a_driver.mjs": "const page = await ctx.newPage();\n" +
			"await page.reload();\n" +
			"const again = await ctx.newPage();\n" +
			"const third = await page.context().newPage();\n",
		"studies/x/tests/b_driver.mjs": "await fresh.reload({ waitUntil: \"load\" });\n",
	})
	want := []string{"studies/x/tests/b_driver.mjs:1", "web-tests/a_driver.mjs:2", "web-tests/a_driver.mjs:3", "web-tests/a_driver.mjs:4"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %q, want %q", got, want)
	}
}

func TestAFirstPageAFreshContextANamedSubjectACommentAndPageCodeAreNot(t *testing.T) {
	got := visitFindings(t, map[string]string{
		"web-tests/a_driver.mjs": "let ctx = await browser.newContext();\n" +
			"const page = ctx.pages()[0] || await ctx.newPage();\n" +
			"ctx = await browser.newContext();\n" +
			"const other = await ctx.newPage();\n" +
			"const p = await browser.newPage();\n" +
			"const q = await browser.newPage();\n" +
			"await page.reload(); // visits again on purpose (a reload is the subject): the controls it hands back\n" +
			"const h2 = await ctx.newPage(); // visits again on purpose (another tab is the subject): signing out in one\n" +
			"// await page.reload() would visit again\n",
		"web/page.js": "location.reload();\n",
	})
	if len(got) != 0 {
		t.Fatalf("got %q, want none", got)
	}
}

func TestASubjectNamedWithoutSayingWhyIsStillFound(t *testing.T) {
	got := visitFindings(t, map[string]string{
		"web-tests/a_driver.mjs": "await page.reload(); // visits again on purpose (a reload is the subject):\n",
	})
	if !reflect.DeepEqual(got, []string{"web-tests/a_driver.mjs:1"}) {
		t.Fatalf("got %q", got)
	}
}
