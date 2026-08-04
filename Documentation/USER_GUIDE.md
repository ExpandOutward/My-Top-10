# My Top 10 - User Guide
A database application that allows users build and display their 10 Ten lists based on their chosen media type.

**Document Version**: 3  
**Product Version**: 3  
**Date**: N/A  
[Version History](#version-history)

## Index
- [Prerequisites](#prerequisites) <!-- D3/P3 -->
- [Login and Access](#login-and-access) <!-- D3/P3 -->
- [Navigation](#navigation) <!-- D3/P3 -->

## Prerequisites <!-- D3/P3 -->
- Basic computer / command line skills
- GitHub account (optional)
- Modern web browser 

## Login and Access <!-- D3/P3 -->
1. Request a user account via [LinkedIn](https://www.linkedin.com/in/expandoutward/) or [Email](mailto:kenjsdev@pm.me)
2. Once you receive your login credentials, visit [https://my-top-10.onrender.com/](https://my-top-10.onrender.com/)
3. Log in with the provided credentials
4. Once logged in, you can change your password by clicking the **Change password** button on the top right of the screen

## Navigation <!-- D3/P3 -->
My Top 10 contains multiple media-types organized in respective tabs. The Movies tab is the default tab that will load upon opening the application. Click the tabs to load tables containing data for each respective media type.

### Display Content <!-- D3/P3 -->
Click the tabs to navigate to each content type. Once content is added, the content respective to the chosen tab will populate in a table.

### Add Content <!-- D3/P3 -->
Each content type has the same 3 fields. Title, Genre, and Year.  
- **Title**: String field 
- **Genre**: String field
- **Year**: Number field

1. Enter applicable data in each field
2. Click **Add Movie**
3. A message will either display a confirmation that the content has been added or an error message

### Edit Content <!-- D3/P3 -->
1. Click the **Edit** button in the row respective to the comment you want to change
2. The **Edit Movie** modal will populate, allowing any of the populated fields to be changed
3. Make the desired changes and click **Save Changes**
4. A message will either display a confirmation that the edit was successful or an error message

### Reordering Lists <!-- D3/P3 -->
#### Method 1 
1. Click between the 4 dots on the left side of the row that you would like to reorder
2. Drag the row to the desired position

#### Method 2
1. Click the **Edit** button in the row respective to the row that you'd like to reorder
2. The **Edit Movie** modal will populate, allowing the user to edit the rank
3. Update the rank to reflect the desired position and click **Save Changes**
4. A message will either display a confirmation that the edit was successful or an error message

### Delete Content <!-- D3/P3 -->
1. Click the **Delete** button in the row respective to the comment you want to remove
2. A confirmation message will ask for confirmation
3. Click **OK**
4. A message will either display a confirmation that the content has been removed or an error message

## Version History <!-- D3/P3 -->
**Note**: Only the previous 5 versions will be included in the version history.

### Version 3
- Updated the Navigation section to include Reordering Lists

### Version 2
### July 2026
- **17-20**: Updated to reflect changes made in application versions 2 & 3
    - Moved from JSON Server to Express.js
    - Users no longer need to download files or run JSON Server
    - Guide significanly simplified due to reduced steps for usage

### Version 1
#### July 2026

- **16**: Initial document published
