package checks

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"claudinite.com/checksdk"
)

const ciTestsYML = `jobs:
  check:
    steps:
      - name: cn check work-and-world
        run: .claudinite/bin/cn check work-and-world
  tests:
    steps:
      - run: echo ~/venv/bin >> "$GITHUB_PATH"
      - name: Run the fast tests
        run: python3 -m pytest web-tests studies lab -q -n auto -m "not full" --durations=5
`

func bash(command string) checksdk.ToolCall {
	in, _ := json.Marshal(map[string]string{"command": command})
	return checksdk.ToolCall{Tool: "Bash", Input: in}
}

func edit(root, rel string) checksdk.ToolCall {
	in, _ := json.Marshal(map[string]string{"file_path": filepath.Join(root, rel)})
	return checksdk.ToolCall{Tool: "Edit", Input: in}
}

// ciFindings is the check's findings' sentences over a session of calls, on a branch changing changed.
func ciFindings(t *testing.T, changed []string, calls func(root string) []checksdk.ToolCall) []string {
	t.Helper()
	root := t.TempDir()
	p := filepath.Join(root, ".github", "workflows", "tests.yml")
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(p, []byte(ciTestsYML), 0o644); err != nil {
		t.Fatal(err)
	}
	f := &checksdk.Fake{Tracked: []string{".github/workflows/tests.yml"}, ChangedFiles: changed, ToolCalls: calls(root)}
	var out []string
	for _, x := range ciRunBeforePush(f.Repo(root)) {
		out = append(out, x.Sentence)
	}
	return out
}

var code = []string{"studies/x/web/a.js"}

func TestAPushAfterAnEditWithoutWhatCIRunsIsFound(t *testing.T) {
	// the study's own folder and one repo-wide test is not the suite CI runs
	got := ciFindings(t, code, func(root string) []checksdk.ToolCall {
		return []checksdk.ToolCall{
			edit(root, "studies/x/web/a.js"),
			bash("python3 -m pytest studies/x/tests web-tests/test_study_contract.py -q"),
			bash("git commit -qm x && git push -u origin b"),
		}
	})
	want(t, got, `pytest web-tests studies lab.*cn check work-and-world`)
}

func TestARunBeforeTheLastEditDoesNotCoverIt(t *testing.T) {
	got := ciFindings(t, code, func(root string) []checksdk.ToolCall {
		return []checksdk.ToolCall{
			bash("python3 -m pytest web-tests studies lab -n auto -m 'not full'"),
			bash(".claudinite/bin/cn check work-and-world"),
			edit(root, "studies/x/web/a.js"),
			bash("git push"),
		}
	})
	want(t, got, `pytest web-tests studies lab.*cn check work-and-world`)
}

func TestOnlyTheMissingRunIsNamed(t *testing.T) {
	got := ciFindings(t, code, func(root string) []checksdk.ToolCall {
		return []checksdk.ToolCall{
			edit(root, "studies/x/web/a.js"),
			bash("python3 -m pytest web-tests studies lab -x > /tmp/o.txt 2>&1; echo $?"),
			bash("git push"),
		}
	})
	want(t, got, `: cn check work-and-world$`)
}

func TestBothRunsBetweenTheEditAndThePushPass(t *testing.T) {
	got := ciFindings(t, code, func(root string) []checksdk.ToolCall {
		return []checksdk.ToolCall{
			edit(root, "studies/x/web/a.js"),
			bash("cd /r && python3 -m pytest lab studies web-tests -q -n auto -m \"not full\""),
			bash(".claudinite/bin/cn check work-and-world"),
			bash("git push -u origin b"),
		}
	})
	want(t, got)
}

func TestNoPushAnEditOutsideTheRepoAndAProseOnlyChangeAreNotJudged(t *testing.T) {
	want(t, ciFindings(t, code, func(root string) []checksdk.ToolCall {
		return []checksdk.ToolCall{edit(root, "studies/x/web/a.js"), bash("git commit -qm x")}
	}))
	want(t, ciFindings(t, code, func(root string) []checksdk.ToolCall {
		return []checksdk.ToolCall{edit(filepath.Dir(root), "scratch.md"), bash("git push")}
	}))
	want(t, ciFindings(t, []string{"docs/WARMUP.md"}, func(root string) []checksdk.ToolCall {
		return []checksdk.ToolCall{edit(root, "docs/WARMUP.md"), bash("git push")}
	}))
}

func TestASubsetBySelectionIsNotTheSuite(t *testing.T) {
	got := ciFindings(t, code, func(root string) []checksdk.ToolCall {
		return []checksdk.ToolCall{
			edit(root, "studies/x/web/a.js"),
			bash("python3 -m pytest web-tests studies lab -k shelves"),
			bash(".claudinite/bin/cn check work-and-world"),
			bash("git push"),
		}
	})
	want(t, got, `pytest web-tests studies lab`)
}
