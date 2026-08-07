# How to access Postgres via Terminal

## Issue
How do I connect to the My Top 10 Postgres database from the terminal?

## Environment
- Redner Dashboard access with permissions to view the Postgres database connection details
- Local Terminal with `psql` installed
- Database role that can read the media tables

## Resolution
### Get the PSQL Command from Render
1. Log in to the Render Dashboard at https://dashboard.render.com/
2. In the **Projects** section, select **My Top 10**
3. Click **my-top-10.db**
4. Scroll down to the **Connections** section
5. Copy the **PSQL Command**

**Important:** Do not share the PSQL Command. Treat it like a password.

### Run the PSQL Command in Terminal
1. Open **Terminal** on your device
2. Paste the PSQL Command and press **Enter**