package checks

import (
	"testing"

	"claudinite.com/checksdk"
)

func historyFindings(t *testing.T, messages ...string) []string {
	t.Helper()
	f := &checksdk.Fake{Messages: messages}
	var out []string
	for _, x := range versionHistoryLines(f.Repo(t.TempDir())) {
		out = append(out, x.Sentence)
	}
	return out
}

func TestTwoDifferentLinesAreFoundAndBothNamed(t *testing.T) {
	got := historyFindings(t,
		"Show JPEGs in Data Management\n\nVersion-history: Data Management lists your JPEG photos too.\n",
		"Drive thumbnails in the Load dialog\n\nVersion-history: the Load dialog shows Drive's own thumbnails.\n")
	want(t, got, `JPEG photos too.*Drive's own thumbnails|Drive's own thumbnails.*JPEG photos too`)
}

func TestOneLineRepeatedNoneAndNoLineAreNot(t *testing.T) {
	line := "Version-history: the 3D view rolls on a horizontal scroll.\n"
	want(t, historyFindings(t, "a\n\n"+line, "b\n\n"+line, "c\n\nVersion-history: none\n", "d\n"))
	want(t, historyFindings(t, "a\n\nVersion-history: none\n", "b\n\nVersion-history:  None \n"))
}
