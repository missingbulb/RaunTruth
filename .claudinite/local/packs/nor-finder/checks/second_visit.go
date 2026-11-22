package checks

import (
	"regexp"
	"strings"

	"claudinite.com/checksdk"
)

// A test starts from the state it needs, seeded, and ends: "it is kept" is two cases, the write asserted where it
// is stored and a page started from that storage, never a reload or another tab between them. A second visit is a
// test's own case only where the visit is the behaviour, named on its line. A page from a fresh context, or from
// browser.newPage, which makes one, is another device starting from its own state, not a second visit.

func init() {
	checksdk.Register(checksdk.Check{
		ID:     "second-visit-in-test",
		Tags:   []string{"world"},
		OnFail: "block",
		Since:  "2026-11-22",
		Why:    "a test that checks what a page kept by visiting it again also runs whatever the first visit still had in flight (a debounced save, a sync, another tab's storage events), so it flakes on the races between the two rather than testing either",
		Run:    secondVisits,
	})
}

var (
	visitFiles   = regexp.MustCompile(`^(web-tests|studies/[^/]+/tests)/.*\.m?js$`)
	visitReload  = regexp.MustCompile(`\.reload\(`)
	visitNewPage = regexp.MustCompile(`([\w.]+(?:\(\))?)\.newPage\(`)
	visitAssign  = regexp.MustCompile(`^\s*(?:(?:const|let|var)\s+)?(\w+)\s*=\s*(?:await\s+)?\S`)
	visitComment = regexp.MustCompile(`^\s*(//|\*|/\*)`)
	visitWaived  = regexp.MustCompile(`//\s*visits again on purpose \((a reload|another tab) is the subject\):\s*\S`)
)

func secondVisits(repo checksdk.Repo) []checksdk.Finding {
	var out []checksdk.Finding
	for _, f := range repo.Tracked() {
		if !visitFiles.MatchString(f) {
			continue
		}
		text, ok := repo.Read(f)
		if !ok {
			continue
		}
		opened := map[string]int{}
		for i, line := range strings.Split(text, "\n") {
			if visitComment.MatchString(line) {
				continue
			}
			// a context made again holds no page yet
			if m := visitAssign.FindStringSubmatch(line); m != nil && strings.Contains(line, "newContext(") {
				delete(opened, m[1])
			}
			var what string
			if visitReload.MatchString(line) {
				what = "reloads the page"
			}
			if m := visitNewPage.FindStringSubmatch(line); m != nil && m[1] != "browser" {
				if strings.HasSuffix(m[1], ".context()") {
					what = "opens another tab in the page's own context"
				} else if opened[m[1]]++; opened[m[1]] > 1 {
					what = "opens another tab in " + m[1]
				}
			}
			if what == "" || visitWaived.MatchString(line) {
				continue
			}
			out = append(out, checksdk.Finding{
				Path:     f,
				Line:     i + 1,
				Sentence: what + ", a second visit checking what the first one left",
				Fix:      "split it: assert what the action stored, then start a page (a fresh context) from that storage seeded; where the visit is itself the behaviour, end the line `// visits again on purpose (a reload is the subject): <why>` or `(another tab is the subject)`",
			})
		}
	}
	return out
}
