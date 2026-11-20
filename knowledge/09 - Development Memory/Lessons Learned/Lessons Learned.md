# Lessons learned

## Backslashes in shell-written code
On this Windows setup, code written through shell heredocs or `sed` lost its backslashes. A regex `\b` became a backspace byte, and `'\\u003c'` lost a level of escaping. **Write source files with the editor tools, not the shell, whenever they contain backslashes**, and check the bytes (`od -c`) when in doubt.

## Check the data before building on it
- The game files give resources per zone, not per map. A full interactive map was built before that limit was accepted, then removed ([[ADR-0005 Remove the in-site map]]).
- Check what the data really contains (`docs/RAPPORT_ARCHITECTURE.md` §3 is a good example) before designing features that need more.

## "Escaped" isn't escaped until tested
The JSON-LD escape looked right for weeks and did nothing ([[JSON-LD escape did nothing]]). Security helpers get a test that feeds the dangerous input.

## Logs are an attack surface
Anything printed in production logs leaves the server (host dashboards, log shipping). Secrets and links never go there ([[Reset links in production logs]]).

## Don't share the user's browser pane while testing
Keystrokes sent to a page the user had just opened changed a character's profession level (2026-11-20). Test in a separate tab.
