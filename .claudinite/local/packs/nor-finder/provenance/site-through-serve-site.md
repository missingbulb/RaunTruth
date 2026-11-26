## 2026-11-26 · born · the site served by one server
- **Source:** the owner asked for tests aligned to uniform launchers and harnesses, with no tests
  left over from earlier versions.
- **Reason:** eight drivers and the Data Management stand-in served the site from servers of their
  own, predating serveSite().
- **Actor:** @missingbulb (owner).
- **Model:** claude-opus-5-5
- **Mechanism:** a declared line check on http.createServer, with the fakes' outside server and the
  explorer left out, since neither serves the site.
