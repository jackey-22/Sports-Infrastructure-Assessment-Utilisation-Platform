# Mobile athlete performance

Coach: open Squad or Evaluate, choose an eligible athlete and sport, enter all active template marks, and submit. Saved totals are calculated by the existing server; the app preview follows the same parameter normalization and rounding. The current roster requires a linked athlete profile and a confirmed, paid booking, matching the web. Published templates are managed on web; the app never creates or invents parameters. Reloading a template clears marks explicitly.

Athlete/Citizen: open Skills or a Performance shortcut to see own evaluations, recognition, parameter breakdowns and coach observations. Submit achievements with sport, category, title and date; event, rank and description are optional. Submitted achievements display Pending, Verified or Rejected status and reviewer remarks. Account details remain available through Account profile.

The app uses the existing authenticated performance, template, sports and achievement endpoints. There are no backend or database migrations, new dependencies, fabricated scores or successful offline submissions. Refresh/re-entry reloads live data; request races are ignored and failed submissions preserve entered values. Missing athlete profiles and unpublished templates are shown as unavailable states.

Checks:

- `node --test client-app/tests/*.test.cjs`
- `node --test server/tests/*.test.js`
- From client-app: `npx --no-install expo export --platform android --output-dir .expo/performance-check`

Tests compare the mobile scoring preview and payloads with the existing backend using mocked persistence. Live cross-device refresh, production authentication and achievement verification still require a running backend and seeded/published templates.


Profile-link handling: a citizen's linked athlete profile may have no SportComplexId yet. The coach roster includes that profile through its citizenUser booking link. Evaluation/history access for an otherwise unassigned profile is supported by a confirmed, paid booking with the authenticated coach at that coach's facility and for an assigned sport. A profile explicitly assigned to another facility does not use this fallback. No payment or facility assignment is fabricated or rewritten.

Current app shortcuts: Neha Shah's seeded coach login and Dhruv's existing linked athlete account. The athlete shortcut fills the email and asks for the account's existing password in the app; personal passwords are not embedded. The previously offered Aarav login had no linked athlete profile in the configured database.
