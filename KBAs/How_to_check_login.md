# How to check login data with PSQL queries

**Access Control**: Internal

## Issue
How do I check login data / user login history using PSQL queries?

## Environment
- Render Dashboard access with permissions to view the Postgres database connection details
- Local Terminal with `psql` available
- Database role that can read login/user activity tables
- Familiarity with [How to access Postgres via Terminal](How_to_access_Postgres.md)

## Resolution

1. Access Postgres SQL
2. Run the queries listed below to pull the respective data

### Useful Queries

**Table:** `session_events`

#### Key fields
- `id` – ID of the entry in the `session_events` table
- `user_id` – ID of the user
- `username` – Username of the user
- `event_type` – `login` or `logout`
- `ip` – IP address of the user
- `user_agent` – Browser information
- `created_at` – Date/time the event was captured

### Example Queries

#### List all events (newest first)
```sql
SELECT *
FROM session_events
ORDER BY created_at DESC;
```

#### List Events According To Username (newest first)
```sql
SELECT *
FROM session_events
WHERE username = 'USER NAME HERE'
ORDER BY created_at DESC;
```