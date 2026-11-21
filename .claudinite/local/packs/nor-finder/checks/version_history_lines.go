package checks

import (
	"regexp"
	"strconv"
	"strings"

	"claudinite.com/checksdk"
)

// The page's version history keeps one Version-history line per pull request, so a branch whose commits carry
// two different ones loses all but one. Which one survives is the version-history tool's to say, so the check
// names every line and leaves the choice to the author. A `none` beside a real line is not a second line.

func init() {
	checksdk.Register(checksdk.Check{
		ID:     "version-history-one-line",
		Tags:   []string{"work"},
		OnFail: "advise",
		Since:  "2026-11-20",
		Why:    "the version history keeps one line per pull request, so every other distinct line on the branch is dropped without a word",
		Run:    versionHistoryLines,
	})
}

var vhLine = regexp.MustCompile(`(?m)^Version-history:[ \t]*(.*?)[ \t]*$`)

func versionHistoryLines(repo checksdk.Repo) []checksdk.Finding {
	seen := map[string]bool{}
	var lines []string
	for _, msg := range repo.CommitMessages() {
		for _, m := range vhLine.FindAllStringSubmatch(msg, -1) {
			if strings.EqualFold(m[1], "none") || seen[m[1]] {
				continue
			}
			seen[m[1]] = true
			lines = append(lines, m[1])
		}
	}
	if len(lines) < 2 {
		return nil
	}
	return []checksdk.Finding{{
		Sentence: "the branch's commits carry " + strconv.Itoa(len(lines)) + " different Version-history lines, and only one is kept: \"" + strings.Join(lines, "\" / \"") + "\"",
		Fix:      "add a commit whose one Version-history line tells every change a user sees here",
	}}
}
