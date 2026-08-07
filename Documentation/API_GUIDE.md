# My Top 10 - API Guide

**Document Version**: 4  
**Product Version**: 4  
**Date**: August 2026  
[Version History](#version-history)

## API Endpoints
**End Point URL**: `https://my-top-10.onrender.com`  
[Prerequisites Key](#prerequisites-key) | [More Data (MD) Elaboration](#more-data-elaboration)

| Action | Method | Endpoint | Body | Response | Prerequisites |
|----------|----------|----------|----------|----------|----------|
| Health check    | GET   | `/health`  | None | [Response](#health-check-response) | None |
| Register user   | POST   | `/auth/register` | [Body](#register-user-body)| [Response](#register-user-response) | AD, P8 |
| Log in    | POST   | `/auth/login`  |[Body](#log-in-body) | [Response](#log-in-response) | EC |
| Log out   | POST  | `/auth/logout`  | None | [Response](#log-out-response)  | LI |
| Get current user    | GET   | `/auth/me` | None | [Response](#get-current-user-reponse)  | LI |
| Change password    | POST   | `/auth/change-password` | [Body](#change-password-body) | [Response](#change-password-response)  | LI, P8, EC|
| Look up user + recent sessions (by ID)  | GET   | `/admin/users/lookup?username=USERID`  | None | [Response](#look-up-user--recent-sessions-response)  | AD, EC |
| Look up user + recent sessions (by Username)  | GET   | `/admin/users/lookup?user_id=USERNAME`  | None | [Response](#look-up-user--recent-sessions-response)  | AD, EC |
| List session events   | GET   | `/admin/session-events`  | None | [Response](#list-session-events-response)  | AD |
| List movies  | GET   | `/movies`  | None | [Response](#list-movies-games-or-shows-response)  | LI, EC |
| Add a movie  | POST   | `/movies`  | [Body](#add-a-movie-game-or-show-body) | [Response](#add-a-movie-game-or-show-response)  | LI, 10 |
| Update a movie   | PUT  | `/movies/:id`  | [Body](#update-a-movie-game-or-show-body) | [Response](#update-a-movie-game-or-show-response)  | LI, EC |
| Delete a movie   | DELETE   | `/movies/:id`  | None | [Response](#delete-a-movie-game-or-show-response)  | LI, EC |
| Reorder movies   | PUT   | `/movies/reorder`   |   [Body](#reorder-movies-games-or-shows-body)  | [Response](#reorder-movies-games-or-shows-reponse)  | LI, EC, MD |
| List games  | GET   | `/games`  | None | [Response](#list-movies-games-or-shows-response)  | LI, EC |
| Add a game  | POST   | `/games`  | [Body](#add-a-movie-game-or-show-body) | [Response](#add-a-movie-game-or-show-response)  | LI, 10 |
| Update a game   | PUT   | `/games/:id`   |  [Body](#update-a-movie-game-or-show-body) | [Response](#update-a-movie-game-or-show-response)  | LI, EC |
| Delete a game   | DELETE   | `/games/:id`   | None | [Response](#delete-a-movie-game-or-show-response)  | LI, EC |
| Reorder games   | PUT  | `/games/reorder`  |   [Body](#reorder-movies-games-or-shows-body)  | [Response](#reorder-movies-games-or-shows-reponse)  | LI, EC, MD |
| List shows  | GET   | `/shows`  | None | [Response](#list-movies-games-or-shows-response)  | LI, EC |
| Add a show  | POST   | `/shows`  | [Body](#add-a-movie-game-or-show-body) | [Response](#add-a-movie-game-or-show-response)  | LI, 10 |
| Update a show   | PUT  | `/shows/:id`   |  [Body](#update-a-movie-game-or-show-body) | [Response](#update-a-movie-game-or-show-response)  | LI, EC |
| Delete a show   | DELETE   | `/shows/:id`   | None | [Response](#delete-a-movie-game-or-show-response)  | LI, EC |
| Reorder shows   | PUT  | `/shows/reorder`  |  [Body](#reorder-movies-games-or-shows-body) | [Response](#reorder-movies-games-or-shows-reponse)  | LI, EC, MD |
|||

### Prerequisites Key
| Prerequisite | Code | Description |
|----------|----------|----------|
| Admin Only    | AD   | Only accessible by Top 10 Admins |
| Logged In | LI | User must be logged in via the Login API request |
| Password Restrictions | P8 | Password must be at least 8 characters |
| Maximum Entries | 10 | Lists can only contain up to 10 entries |
| Existing Content | EC | The content must exist to be pulled, changed, or deleted |
| More Data Required | MD | More data is required for the API Request
|||

### More Data Elaboration
| API Request | Data Required | Retrieving Data |
|----------|----------|----------|
| Reorder Movies    | Movie ID Numbers   | Run the Get Movies API Request and take note of the IDs |
| Reorder Games    | Game ID Numbers   | Run the Get Games API Request and take note of the IDs |
| Reorder Shows    | Show ID Numbers   | Run the Get Shows API Request and take note of the IDs |
|||


## Body Text

### Register User Body
```json 
{
  "username": "desired_username",
  "password": "desired_password"
}
```

### Log In Body
```json 
{
  "username": "your_username",
  "password": "your_password"
}
```

### Change Password Body
```json
{
  "currentPassword": "your_current_password",
  "newPassword": "your_new_password"
}
```

### Add a Movie, Game, or Show Body
```json
{
  "title": "Movie Title",
  "genre": "Genre",
  "year": "YYYY"
}
```

### Update a Movie, Game, or Show Body
```json 
{
  "title": "Updated Title",
  "genre": "Updated Genre",
  "year": "YYYY",
  "rank": "1 - 10 (optional)"
}
```

### Reorder Movies, Games, or Shows Body
**Important**: Run the List APIs to get the IDs needed for the query. Replace the `#` with the object IDs in the order that you wish for them to be presented. Note that these are the IDs, not the rank. The rank is assumed by the order of the IDs.
```sql
{
  "orderedIds": [#, #, #]
}
```

## Response Text

### Health Check Response
```json
{
    "status": "ok",
    "database": "connected",
    "databaseUrlConfigured": true,
    "tables": [
        "games",
        "movies",
        "session_events",
        "shows",
        "users"
    ],
    "error": null
}
```

### Register User Response
```json
{
    "id": #,
    "username": "user_name_created",
    "message": "User created. They can log in with this username and password."
}
```

### Log In Response
```json
{
    "id": #,
    "username": "user_name"
}
```

### Log Out Response 
```json
{
    "message": "Logged out"
}
```

### Get Current User Reponse
```json
{
    "id": #,
    "username": "user_name",
    "created_at": "YYYY-MM-DDTHH:MM:SS.SSSZ",
    "last_login_at": "YYYY-MM-DDTHH:MM:SS.SSSZ"
}
```

### Change Password Response
```json
{
    "message": "Password updated"
}
```

### Look Up User + Recent Sessions Response
```json
{
    "user": {
        "id": #,
        "username": "username",
        "created_at": "YYYY-MM-DDTHH:MM:SS.SSSZ",
        "last_login_at": "YYYY-MM-DDTHH:MM:SS.SSSZ"
    },
    "recent_events": [
        {
            "id": #,
            "event_type": "logout",
            "ip": "#.#.#.#",
            "user_agent": "Device/App Info",
            "created_at": "YYYY-MM-DDTHH:MM:SS.SSSZ"
        },
        {
            "id": #,
            "event_type": "login",
            "ip": "#.#.#.#",
            "user_agent": "Device/App Info",
            "created_at": "YYYY-MM-DDTHH:MM:SS.SSSZ"
        }
    ]
}
```

### List Session Events Response
```json
{
    "count": 13,
    "events": [
        {
            "id": #,
            "user_id": #,
            "username": "username",
            "event_type": "logout",
            "ip": "#.#.#.#",
            "user_agent": "Device / App info",
            "created_at": "YYYY-MM-DDTHH:MM:SS.SSSZ"
        },
        {
            "id": #,
            "user_id": #,
            "username": "username",
            "event_type": "logout",
            "ip": "#.#.#.#",
            "user_agent": "Device / App info",
            "created_at": "YYYY-MM-DDTHH:MM:SS.SSSZ"
        },
    ]
}

```

### List Movies, Games, or Shows Response
```json
[
    {
        "id": #,
        "title": "Title",
        "genre": "Genre",
        "year": "YYYY",
        "rank": #
    },
    {
        "id": #,
        "title": "Title",
        "genre": "Genre",
        "year": "YYYY",
        "rank": #
    },
    {
        "id": #,
        "title": "Title",
        "genre": "Genre",
        "year": "YYYY",
        "rank": #
    }
]

```

### Add A Movie, Game, or Show Response
```json
{
    "id": #,
    "title": "Title",
    "genre": "Genre",
    "year": "YYYY",
    "rank": #
}
```

### Update A Movie, Game, or Show Response
```json
{
    "id": #,
    "title": "New Title",
    "genre": "Genre",
    "year": "YYYY",
    "rank": #
}
```

### Delete A Movie, Game, or Show Response
```json
{
    "message": "Deleted"
}
```

### Reorder Movies, Games, or Shows Reponse
```json
[
    {
        "id": #,
        "title": "Title",
        "genre": "Genre",
        "year": "YYYY",
        "rank": 1
    },
    {
        "id": #,
        "title": "Title",
        "genre": "Genre",
        "year": "YYYY",
        "rank": 2
    },
    {
        "id": #,
        "title": "Title",
        "genre": "Genre",
        "year": "YYYY",
        "rank": 3
    }
]
```

## Version History

### Version 4
#### August 2026
- Updated documentation to align with product v4.
- Replaced index with table listing each API endpoint

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