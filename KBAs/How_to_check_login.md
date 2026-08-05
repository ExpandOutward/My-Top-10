# How to check login data with PSQL queries

## Issue
How do I check login data / user login history using PSQL queries?

## Environment
- Render Dashboard access with permissions to view the Postgres database connection details
- Local Terminal with `psql` available
- Database role that can read login/user activity tables

## Resolution

### Get the PSQL Command
1. Log in to the Render Dashboard at https://dashboard.render.com/
2. In the **Projects** portlet, select **My Top 10**
3. Click **my-top-10.db**
4. Scroll down to the **Connections** section
5. Copy the **PSQL Command**

**Important:** Do not share the PSQL Command. Treat it like a password.

### Run the PSQL Command in Terminal
1. Open **Terminal** on your device
2. Paste the PSQL Command and press **Enter**

### Useful Queries

**Table:** `session_events`

**Key fields:**
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

#### List Events According To Username In Descending Order
```sql
SELECT *
FROM session_events
WHERE username = 'USER NAME HERE'
ORDER BY created_at DESC
```