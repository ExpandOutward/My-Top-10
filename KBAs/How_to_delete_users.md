# How to delete users with PSQL?

## Issue
How do I delete users with PSQL?

## Environment
- Render Dashboard access with permissions to view the Postgres database connection details
- Local Terminal with `psql` available
- Database role that can delete from the `users` table
- Familiarity with [How to access Postgres via Terminal](How_to_access_Postgres.md)

## Resolution

1. Open a terminal and run `psql`
2. Look up the user
```sql
SELECT id, username, created_at, last_login_at
FROM users
WHERE username = 'username here';
```
3. Run either of the following queries  

#### Delete by username
```sql
DELETE 
FROM users
WHERE username = 'username here'
RETURNING id, username;
```
#### Delete by id
```sql
DELETE 
FROM users
WHERE id = 1
RETURNING id, username;
```