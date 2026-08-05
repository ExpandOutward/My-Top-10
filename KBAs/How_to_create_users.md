# How do I create users using Postman?

**Access Control:** Internal

## Issue
How do I create a new user for the My Top 10 application using Postman?

## Environment
- Access to the **My Top 10 - Admin** environment variables (to retrieve the Admin Key)
- Postman installed and set up

## Resolution
### Configure Postman
#### Import Evironment Variables
1. Open Postman
2. Click **Environments** > **Import**
3. Import the **My Top 10 - Admin** environment variables
4. Confirm that an entry exists under **Variable** for **admin_key** and **base_url**

**Important:** Do not share the Admin Key. Treat it like a password.

#### Configure the Postman request
1. Open Postman
2. Click **Collections** > **New**
3. Select **HTTP**
4. Click the dropdown menu to the left of the address bar
5. Select **POST**
6. In the address bar, enter `{{base_url}}/auth/register`
7. Click the **Headers** tab
8. Add the **Key** `X-Admin-Secret` with the **Value** `{{admin_key}}`
9. Click the **Body** tab and paste the JSON code below, updating the **username** and **password** to the desired value
```json
{
  "username": "User Name",
  "password": "Password"
}
```
10. Click the **Send** button

If the user is successfully created, the JSON response will look like this:
```json
{
    "id": 8,
    "username": "username",
    "message": "User created. They can log in with this username and password."
}
```