# Grievance workflow

All app and web roles share `/api/grievances`. Authentication is required.

- `GET /api/grievances?view=mine|assigned`: scoped rows with handlingRole, overdue, revision, history and permitted actions. Without a view, returns the union of own and assigned rows. Legacy list filters narrow this scope.
- `GET /api/grievances/facilities`: eligible facilities for creation.
- `POST /api/grievances`: sportsComplex, subject, description, optional proofUrl/proofName/proofKey from the attachment upload endpoint.
- `POST /api/grievances/:id/respond`: response, resolve (boolean), revision from the displayed row.
- `POST /api/grievances/:id/escalate`: reason, revision from the displayed row. Moves one level upward only.

Citizens/athletes, coaches and gate operators start with Supervisor. Supervisor submissions start with Manager, Manager submissions with District Authority, and Authority/Admin submissions with Admin. Only the assigned handling role in the facility/district scope can respond or resolve; authors cannot handle their own submission. Staff authors and assigned handlers may escalate unresolved records. Athlete/Citizen accounts cannot manually escalate; their overdue grievances still escalate automatically. Admin is the terminal level.

`GRIEVANCE_RESPONSE_HOURS` defaults to 48. The existing five-minute scheduler advances unresolved overdue grievances one level and starts a fresh deadline. Responses preserve deadlines. Resolved records do not escalate. Conditional revision updates prevent duplicate transitions and return 409 on stale writes. Notifications reuse reminders; notification failures are logged without falsely reporting a committed mutation as failed.

Legacy complaint routes delegate to this workflow. Legacy records are normalized idempotently on first list/action or scheduled run, preserving valid level, status and deadlines; missing deadlines receive a fresh configured response period. No separate database migration command is needed. Keep the server process running for automatic escalation. Existing storage and push-notification configuration is reused. No environment secrets are changed.

Validation: `node --test server/tests/*.test.js`, `npm run build` in client-web, and `npx --no-install expo export --platform android --output-dir .expo/grievance-check` in client-app. Server tests mock persistence; they do not exercise a live MongoDB or external upload/push services.
