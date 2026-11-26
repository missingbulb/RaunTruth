// A test's checks, said as each is made: "ok: what", or "FAILED: what" with what was seen instead, as JSON, when
// given. A failed one fails the run as it exits, whatever exit code the test sets. Every driver's, a page test's
// (harness.mjs passes them on) and a test of plain code's alike.
//   check(ok, what, seen)            true when it held; the run goes on
//   mustHold(ok, what, seen)         the run ends here when it does not hold: what comes after cannot run without it
let failedChecks = 0;
export function check(ok, what, seen) {
  if (ok) console.log("ok: " + what);
  else { failedChecks++; console.error("FAILED: " + what + (seen === undefined ? "" : ": " + JSON.stringify(seen))); }
  return !!ok;
}

export function mustHold(ok, what, seen) {
  if (!check(ok, what, seen)) process.exit(1);
}

process.on("exit", (code) => { if (failedChecks && code === 0) process.exitCode = 1; });
