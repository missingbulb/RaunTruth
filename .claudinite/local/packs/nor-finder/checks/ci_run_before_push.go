package checks

import (
	"encoding/json"
	"path"
	"regexp"
	"strings"

	"claudinite.com/checksdk"
)

// What a pull request's Tests run starts with is read from the workflow itself: its fast pytest, whose path
// arguments a session's own run must all name, its cn check, and each Python script it runs as `<script> check`. A run naming a subset (-k, a test file, one
// study's folder) is not that suite. Only an edit inside the repo counts, and a branch changing nothing but
// Markdown is not judged.

const ciWorkflow = ".github/workflows/tests.yml"

func init() {
	checksdk.Register(checksdk.Check{
		ID:     "ci-run-before-push",
		Tags:   []string{"work"},
		OnFail: "block",
		Since:  "2026-11-20",
		Why:    "a push CI then fails costs a review round: the change was handed over as passing, and the fix after an approval needs approving again",
		Run:    ciRunBeforePush,
	})
}

var (
	ciPytestLine = regexp.MustCompile(`(?m)^\s*run:\s*(.*\bpytest\b.*)$`)
	ciCnLine     = regexp.MustCompile(`(?m)^\s*run:\s*\S*\bcn\s+check\s+(\S+)`)
	ciScriptLine = regexp.MustCompile(`(?m)^\s*run:\s*python3?\s+(\S+\.py)\s+check\b`)
	ciPush       = regexp.MustCompile(`\bgit\s+push\b`)
	ciQuoted     = regexp.MustCompile(`'[^']*'|"[^"]*"`)
	ciSelecting  = regexp.MustCompile(`(^|\s)-k(\s|$)|::`)
	ciEditTools  = map[string]bool{"Edit": true, "Write": true, "NotebookEdit": true}
	ciValueFlags = map[string]bool{"-n": true, "-m": true, "-k": true, "-p": true, "-c": true, "-o": true, "--maxfail": true, "--durations": true}
)

// pytestPaths is the path arguments of the pytest in a command, nil when it runs none.
func pytestPaths(command string) []string {
	for _, part := range regexp.MustCompile(`&&|\|\||[;|\n]`).Split(ciQuoted.ReplaceAllString(command, "q"), -1) {
		f := strings.Fields(part)
		for i, w := range f {
			if w != "pytest" {
				continue
			}
			var paths []string
			for j := i + 1; j < len(f); j++ {
				if strings.HasPrefix(f[j], ">") || f[j] == "2>&1" {
					break
				}
				if strings.HasPrefix(f[j], "-") || ciValueFlags[f[j-1]] {
					continue
				}
				paths = append(paths, strings.TrimSuffix(f[j], "/"))
			}
			return paths
		}
	}
	return nil
}

func covers(have, want []string) bool {
	set := map[string]bool{}
	for _, h := range have {
		set[h] = true
	}
	for _, w := range want {
		if !set[w] {
			return false
		}
	}
	return len(want) > 0
}

func ciRunBeforePush(repo checksdk.Repo) []checksdk.Finding {
	prose := true
	for _, f := range repo.ChangedFiles() {
		if !strings.HasSuffix(f, ".md") {
			prose = false
		}
	}
	if prose {
		return nil
	}
	workflow, ok := repo.Read(ciWorkflow)
	if !ok {
		return nil
	}
	var suite []string
	var suiteText, cnSub string
	if m := ciPytestLine.FindStringSubmatch(workflow); m != nil {
		suite = pytestPaths(m[1])
		suiteText = "pytest " + strings.Join(suite, " ")
	}
	if m := ciCnLine.FindStringSubmatch(workflow); m != nil {
		cnSub = m[1]
	}
	var scripts []string
	for _, m := range ciScriptLine.FindAllStringSubmatch(workflow, -1) {
		scripts = append(scripts, m[1])
	}
	ciCn := regexp.MustCompile(`\bcn\s+check\s+` + regexp.QuoteMeta(cnSub) + `\b`)
	root := path.Clean(repo.Root())

	calls := repo.Session().ToolCalls()
	push, edited := -1, -1
	// the last push that followed an edit, and the last edit before it
	last := -1
	for i, c := range calls {
		var in struct {
			Command  string `json:"command"`
			FilePath string `json:"file_path"`
		}
		_ = json.Unmarshal(c.Input, &in)
		if ciEditTools[c.Tool] && strings.HasPrefix(path.Clean(in.FilePath), root+"/") {
			last = i
		}
		if c.Tool == "Bash" && ciPush.MatchString(in.Command) && last >= 0 {
			push, edited = i, last
		}
	}
	if push < 0 {
		return nil
	}
	ranSuite, ranCn := len(suite) == 0, cnSub == ""
	ranScript := map[string]bool{}
	for _, c := range calls[edited+1 : push] {
		if c.Tool != "Bash" {
			continue
		}
		var in struct {
			Command string `json:"command"`
		}
		_ = json.Unmarshal(c.Input, &in)
		if !ciSelecting.MatchString(in.Command) && covers(pytestPaths(in.Command), suite) {
			ranSuite = true
		}
		if ciCn.MatchString(in.Command) {
			ranCn = true
		}
		for _, sc := range scripts {
			if regexp.MustCompile(regexp.QuoteMeta(sc) + `\s+check\b`).MatchString(in.Command) {
				ranScript[sc] = true
			}
		}
	}
	var missing []string
	if !ranSuite {
		missing = append(missing, suiteText)
	}
	if !ranCn {
		missing = append(missing, "cn check "+cnSub)
	}
	for _, sc := range scripts {
		if !ranScript[sc] {
			missing = append(missing, sc+" check")
		}
	}
	if len(missing) == 0 {
		return nil
	}
	return []checksdk.Finding{{
		Path:     ciWorkflow,
		Sentence: "edited, then pushed without the runs a pull request's Tests make since: " + strings.Join(missing, "; "),
		Fix:      "run them as " + ciWorkflow + " does, its flags included, after the last edit and before the push",
	}}
}
