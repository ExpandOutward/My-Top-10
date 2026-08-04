# My Top 10 - API Guide

**Document Version**: 3  
**Product Version**: 4 (session capture)  
**Date**: August 2026  
[Version History](#version-history)

## Index
- [Authorization](#authorization) <!-- D2/P3 -->
    - [Log In](#log-in) <!-- D2/P3 -->
    - [Get Current Login Details](#get-current-login-details) <!-- D2/P3 -->
    - [Change Password](#change-password) <!-- V2 -->
    - [Log Out](#log-out) <!-- D2/P3 -->
- [Support / Admin End Points](#support--admin-end-points) <!-- V4 -->
    - [Look Up User and Recent Sessions](#look-up-user-and-recent-sessions) <!-- V4 -->
    - [List Session Events](#list-session-events) <!-- V4 -->
- [GET End Points](#get-end-points) <!-- D2/P3 -->
    - [GET List Content](#get-list-content) <!-- D2/P3 -->
- [POST End Points](#post-end-points) <!-- D2/P3 -->
    - [POST Content To List](#post-content-to-list) <!-- D2/P3 -->
- [PUT End Points](#put-end-points) <!-- D2/P3 -->
    - [Update Existing Content](#update-existing-concent) <!-- D2/P3 -->

## Authorization  <!-- D2/P3 -->

### Log In  <!-- D2/P3 -->

| Element | Value |
|----------|-------------|
|     Method     |      POST       |
|     URL     |      https://my-top-10.onrender.com/auth/login       |
| Content-Type | application/json |
| Body | raw / JSON |

#### Body Text
```json
{
  "username": "username",
  "password": "password"
}

```

#### Response Body
```json
{
    "id": 1,
    "username": "user"
}

```

### Get Current Login Details  <!-- D2/P3 -->

| Element | Value |
|----------|-------------|
|     Method     |      GET       |
|     URL     |      https://my-top-10.onrender.com/auth/me       |
| Content-Type | application/json |

#### Response Body
```json
{
    "id": 1,
    "username": "username",
    "created_at": "2026-07-18T21:42:51.950Z",
    "last_login_at": "2026-08-04T15:22:10.123Z"
}

```

`last_login_at` is updated on each successful login. It may be `null` for accounts that have never signed in.

### Change Password  <!-- D2/P3 -->

| Element | Value |
|----------|-------------|
|     Method     |      POST       |
|     URL     |      https://my-top-10.onrender.com/auth/change-password       |
| Content-Type | application/json |
| Body | raw / JSON |

#### Body Text
```json
{
  "currentPassword": "currentpassword",
  "newPassword": "newpassword"
}

```

#### Response Body
```json
{
    "message": "Password updated"
}

```

### Log Out <!-- D2/P3 -->

| Element | Value |
|----------|-------------|
|     Method     |      POST       |
|     URL     |      https://my-top-10.onrender.com/auth/logout       |


#### Response Body
```json
{
    "message": "Logged out"
}

```

Successful logins, logouts, and failed login attempts are written to the `session_events` table for support troubleshooting. Closing a browser tab does **not** create a logout event — only an explicit Log Out does.

## Support / Admin End Points  <!-- V4 -->

These endpoints are for invite/admin use (support investigations, account checks). They require the same `X-Admin-Secret` header used for user registration. Do **not** share this secret with end users.

| Header | Value |
|--------|--------|
| X-Admin-Secret | Your admin secret (same as account creation) |

### Look Up User and Recent Sessions  <!-- V4 -->

Use this first when a user reports login problems. Returns the account plus their 10 most recent session events.

| Element | Value |
|----------|-------------|
| Method | GET |
| URL | https://my-top-10.onrender.com/admin/users/lookup |
| Header | X-Admin-Secret |
| Query | `username` **or** `user_id` |

#### Example
```
GET /admin/users/lookup?username=recruiter1
```

#### Response Body
```json
{
  "user": {
    "id": 1,
    "username": "recruiter1",
    "created_at": "2026-07-18T21:42:51.950Z",
    "last_login_at": "2026-08-04T15:22:10.123Z"
  },
  "recent_events": [
    {
      "id": 42,
      "event_type": "login",
      "ip": "203.0.113.10",
      "user_agent": "Mozilla/5.0 ...",
      "created_at": "2026-08-04T15:22:10.123Z"
    },
    {
      "id": 41,
      "event_type": "login_failed",
      "ip": "203.0.113.10",
      "user_agent": "Mozilla/5.0 ...",
      "created_at": "2026-08-04T15:21:58.001Z"
    }
  ]
}
```

#### Event types (support reference)

| event_type | Meaning |
|------------|---------|
| `login` | Password accepted; session created |
| `logout` | User explicitly logged out |
| `login_failed` | Wrong password or unknown username |

**Support tip**: Several `login_failed` rows right before a successful `login` often means a password typo. `login_failed` with no matching user and no later success can mean the username is wrong or the account was never created.

### List Session Events  <!-- V4 -->

Broader history search. Filters are optional and can be combined.

| Element | Value |
|----------|-------------|
| Method | GET |
| URL | https://my-top-10.onrender.com/admin/session-events |
| Header | X-Admin-Secret |
| Query (optional) | `username`, `user_id`, `event_type`, `limit` (default 50, max 200) |

#### Examples
```
GET /admin/session-events?username=recruiter1&limit=20
GET /admin/session-events?event_type=login_failed&limit=50
GET /admin/session-events?user_id=1&event_type=logout
```

#### Response Body
```json
{
  "count": 2,
  "events": [
    {
      "id": 42,
      "user_id": 1,
      "username": "recruiter1",
      "event_type": "login",
      "ip": "203.0.113.10",
      "user_agent": "Mozilla/5.0 ...",
      "created_at": "2026-08-04T15:22:10.123Z"
    }
  ]
}
```

#### SQL (optional, for deeper investigation)

If you have database access, you can also query directly:

```sql
-- Recent activity for a user
SELECT event_type, ip, user_agent, created_at
FROM session_events
WHERE username = 'recruiter1'
ORDER BY created_at DESC
LIMIT 25;

-- Last login timestamp on the account
SELECT id, username, last_login_at, created_at
FROM users
WHERE username = 'recruiter1';
```

##  GET End points  <!-- D2/P3 -->
The GET End Points display all of the list details respective of the chosen end point.

**Important**: These API calls require authentication. Log in to the API server first (via Postman or your preferred client).

### GET List Content  <!-- D2/P3 -->


| Element | Value |
|----------|-------------|
|     Method     |      GET       |
|     Movies URL     |      https://my-top-10.onrender.com/movies       |
|     Games URL     |      https://my-top-10.onrender.com/games       |
|     Shows URL     |      https://my-top-10.onrender.com/shows       |

#### Response Body (Movies)
```json
[
    {
        "id": 1,
        "title": "Halloween",
        "genre": "Horror",
        "year": "1978"
    },
    {
        "id": 2,
        "title": "Never Hike In The Snow",
        "genre": "Horror",
        "year": "2021"
    }
]
```

## POST End Points  <!-- D2/P3 -->

The POST End Points allow users to add content to lists through API calls.

**Important**: These API calls require authentication. Log in to the API server first (via Postman or your preferred client).

### POST Content To List  <!-- D2/P3 -->

| Element | Value |
|----------|-------------|
|     Method     |      POST       |
|     Movies URL     |      https://my-top-10.onrender.com/movies       |
|     Games URL     |      https://my-top-10.onrender.com/games       |
|     Shows URL     |      https://my-top-10.onrender.com/shows       |
| Content-Type | application/json |
| Body | raw / JSON |

#### Request Body
```JSON
{
    "title": "Title",
    "genre": "Genre",
    "year": Year
}
```

#### Response Body
```JSON
{
    "id": 1,
    "title": "LOST",
    "genre": "Mystery",
    "year": "2002"
}
```

## PUT End Points <!-- D2/P3 -->

### Update Existing Content <!-- D2/P3 -->
Replace the `#` with the `id` of the object that you would like to update.

| Element | Value |
|----------|-------------|
|     Method     |      POST       |
|     Movies URL     |      https://my-top-10.onrender.com/movies/#       |
|     Games URL     |      https://my-top-10.onrender.com/games/#       |
|     Shows URL     |      https://my-top-10.onrender.com/shows/#       |
| Content-Type | application/json |
| Body | raw / JSON |

#### Request Body
```JSON
{
    "title": "Title",
    "genre": "Genre",
    "year": Year
}
```

#### Response Body
```JSON
{
    "id": 1,
    "title": "Halloween",
    "genre": "Horror",
    "year": "2018"
}
```

## DELETE End Points <!-- D2/P3 -->

### Delete Content <!-- D2/P3 -->
Replace the `#` with the `id` of the object that you would like to delete.

| Element | Value |
|----------|-------------|
|     Method     |      POST       |
|     Movies URL     |      https://my-top-10.onrender.com/movies/#       |
|     Games URL     |      https://my-top-10.onrender.com/games/#       |
|     Shows URL     |      https://my-top-10.onrender.com/shows/#       |

#### Response Body
```JSON
{
    "message": "Deleted"
}
```

## Version History

### Version 3
#### August 2026
- Documented session capture for support: `last_login_at` on `/auth/me`, admin lookup and session-events endpoints, event type reference, and sample SQL.

### Version 2
- **17 - 20**: Updated documentation to reflect changes made after moving from JSON Server to Express.js.
  - Most significant change in regard to API enables users to use a public URL.
  - Previously, users had to download the application and run npm. This is no longer required. 

### Version 1
#### July 2026
- **16**: Initial document published