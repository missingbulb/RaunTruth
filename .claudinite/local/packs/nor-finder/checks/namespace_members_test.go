package checks

import (
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"testing"

	"claudinite.com/checksdk"
)

// namespaceFindings is the check's findings, as path:line sentence, over files written under a fresh root.
func namespaceFindings(t *testing.T, files map[string]string) []string {
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
	for _, f := range namespaceMembers((&checksdk.Fake{Tracked: tracked}).Repo(root)) {
		out = append(out, f.Path+":"+strconv.Itoa(f.Line)+" "+f.Sentence)
	}
	sort.Strings(out)
	return out
}

func TestAMemberTheImportedModuleNoLongerExportsIsFound(t *testing.T) {
	got := namespaceFindings(t, map[string]string{
		"studies/x/web/gt_actions.js": "export const OLD_GRID = 10;\nexport function score(a) { return a; }\n",
		"studies/x/web/old_marks.js": "import * as N from \"./gt_actions.js\";\n\n" +
			"export function keep(area) {\n  return area < N.GRID * N.GRID && N.score(area);\n}\n",
		// a test reaching the page's module the same way reads the same undefined
		"studies/x/tests/a_driver.mjs": "import * as G from '../web/gt_actions.js';\nconsole.log(G.OLD_GRID, G.cells);\n",
	})
	want(t, got,
		`^studies/x/tests/a_driver\.mjs:2 .*\bG\.cells\b.*gt_actions\.js`,
		`^studies/x/web/old_marks\.js:4 .*\bN\.GRID\b.*gt_actions\.js`,
	)
}

func TestEveryWayOfExportingCountsAndWhatIsNotAMemberReadIsNot(t *testing.T) {
	got := namespaceFindings(t, map[string]string{
		"web/a.js": "export const A = 1;\nexport let B = 2;\nexport async function c() {}\nexport function* d() {}\n" +
			"export class E {}\nconst f = 1, g = 2;\nexport { f, g as G };\nexport default 3;\nexport * from './b.js';\n" +
			"export { H } from './b.js';\n",
		"web/b.js": "export const deep = 1;\nexport const H = 2;\n",
		"web/use.js": "import * as M from './a.js';\nimport * as Ext from 'https://cdn.example/x.js';\n" +
			"// M.GONE is only a comment\nconst s = \"M.inAString\";\n" +
			"M.A + M.B + M.c() + M.d() + new M.E() + M.f + M.G + M.default + M.deep + M.H + Ext.anything;\n" +
			"other.M.notOurs;\n",
	})
	want(t, got)
}

func TestAModuleThatIsNotTrackedIsNotJudged(t *testing.T) {
	got := namespaceFindings(t, map[string]string{
		"web/use.js": "import * as Gen from './generated.js';\nGen.anything;\n",
	})
	want(t, got)
}
