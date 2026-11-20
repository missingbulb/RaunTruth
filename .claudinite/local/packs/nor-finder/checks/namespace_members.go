package checks

import (
	"fmt"
	"path"
	"regexp"
	"sort"
	"strings"

	"claudinite.com/checksdk"
)

// A module's namespace is what it exports, so a read of a member it does not export is undefined, and
// arithmetic or a comparison over it goes on as NaN or false without an error. The check follows `export *
// from` and `export { } from` into the modules they name; a module it cannot read (outside the tree, generated)
// is not judged.

func init() {
	checksdk.Register(checksdk.Check{
		ID:     "namespace-member-exported",
		Tags:   []string{"world"},
		OnFail: "block",
		Since:  "2026-11-20",
		Why:    "a namespace member its module does not export reads as undefined, so a comparison over it is quietly false and nothing logs it",
		Run:    namespaceMembers,
	})
}

var (
	nsScript     = regexp.MustCompile(`\.m?js$`)
	nsImport     = regexp.MustCompile(`import\s*\*\s*as\s+([A-Za-z_$][\w$]*)\s+from\s*['"](\.{1,2}/[^'"]+)['"]`)
	nsDeclared   = regexp.MustCompile(`(?m)^\s*export\s+(?:default\s+)?(?:async\s+)?(?:const|let|var|function\s*\*?|class)\s+([A-Za-z_$][\w$]*)`)
	nsDefault    = regexp.MustCompile(`(?m)^\s*export\s+default\b`)
	nsList       = regexp.MustCompile(`(?m)^\s*export\s*\{([^}]*)\}\s*(?:from\s*['"]([^'"]+)['"])?`)
	nsStar       = regexp.MustCompile(`(?m)^\s*export\s*\*\s*from\s*['"]([^'"]+)['"]`)
	nsStringBody = regexp.MustCompile(`'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"`)
)

// exportsOf is the names the module at rel exports, false when it is not in the tree.
func exportsOf(repo checksdk.Repo, tracked map[string]bool, rel string, seen map[string]bool) (map[string]bool, bool) {
	if !tracked[rel] {
		return nil, false
	}
	text, ok := repo.Read(rel)
	if !ok {
		return nil, false
	}
	names := map[string]bool{}
	if seen[rel] {
		return names, true
	}
	seen[rel] = true
	code := checksdk.StripComments(text)
	for _, m := range nsDeclared.FindAllStringSubmatch(code, -1) {
		names[m[1]] = true
	}
	if nsDefault.MatchString(code) {
		names["default"] = true
	}
	for _, m := range nsList.FindAllStringSubmatch(code, -1) {
		for _, part := range strings.Split(m[1], ",") {
			if f := strings.Fields(part); len(f) > 0 {
				names[f[len(f)-1]] = true
			}
		}
	}
	for _, m := range nsStar.FindAllStringSubmatch(code, -1) {
		more, ok := exportsOf(repo, tracked, path.Join(path.Dir(rel), m[1]), seen)
		if !ok {
			return nil, false
		}
		for n := range more {
			if n != "default" {
				names[n] = true
			}
		}
	}
	return names, true
}

func namespaceMembers(repo checksdk.Repo) []checksdk.Finding {
	tracked := map[string]bool{}
	for _, f := range repo.Tracked() {
		tracked[f] = true
	}
	var out []checksdk.Finding
	for _, file := range repo.Tracked() {
		if !nsScript.MatchString(file) {
			continue
		}
		text, ok := repo.Read(file)
		if !ok {
			continue
		}
		code := checksdk.StripComments(text)
		imports := nsImport.FindAllStringSubmatch(code, -1)
		if len(imports) == 0 {
			continue
		}
		lines := strings.Split(code, "\n")
		for _, m := range imports {
			alias, target := m[1], path.Join(path.Dir(file), m[2])
			exported, ok := exportsOf(repo, tracked, target, map[string]bool{})
			if !ok {
				continue
			}
			read := regexp.MustCompile(`(^|[^\w$.])` + regexp.QuoteMeta(alias) + `\.([A-Za-z_$][\w$]*)`)
			for i, line := range lines {
				if nsImport.MatchString(line) {
					continue
				}
				missing := map[string]bool{}
				for _, r := range read.FindAllStringSubmatch(nsStringBody.ReplaceAllString(line, `""`), -1) {
					if !exported[r[2]] {
						missing[r[2]] = true
					}
				}
				var names []string
				for n := range missing {
					names = append(names, n)
				}
				sort.Strings(names)
				for _, n := range names {
					out = append(out, checksdk.Finding{
						Path:     file,
						Line:     i + 1,
						Sentence: fmt.Sprintf("reads %s.%s, which %s does not export", alias, n, target),
						Fix:      fmt.Sprintf("read a name %s exports, or export %s from it again", target, n),
					})
				}
			}
		}
	}
	return out
}
