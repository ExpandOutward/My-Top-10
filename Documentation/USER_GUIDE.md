# My Top 10 - User Guide
A database application that allows users build and display their 10 Ten lists based on their chosen media type.

**Document Version**: 4
**Product Version**: 5  
**Date**: N/A  
[Version History](#version-history)

## Index
- [Prerequisites](#prerequisites) 
- [Login and Access](#login-and-access) 
- [Navigation](#navigation)
- [Display Content](#display-content)
- [Add Content](#add-content)
- [Edit Content](#edit-content)
- [Reordering Lists](#reordering-lists)
- [Delete Content](#delete-content)
- [Import or Export Content](#import-or-export-content)
- [Download Shareable List Image](#download-shareable-list-image)

## Prerequisites 
- Basic computer / command line skills
- GitHub account (optional)
- Modern web browser 

## Login and Access 
1. Request a user account via [LinkedIn](https://www.linkedin.com/in/expandoutward/) or [Email](mailto:kenjsdev@pm.me)
2. Once you receive your login credentials, visit [https://my-top-10.onrender.com/](https://my-top-10.onrender.com/)
3. Log in with the provided credentials
4. Once logged in, you can change your password by clicking the **Change password** button on the top right of the screen

## Navigation 
My Top 10 contains multiple media-types organized in respective tabs. The Movies tab is the default tab that will load upon opening the application. Click the tabs to load tables containing data for each respective media type.

## Display Content 
Click the tabs to navigate to each content type. Once content is added, the content respective to the chosen tab will populate in a table.

## Add Content 
Each content type has the same 3 fields. Title, Genre, and Year.  
- **Title**: String field 
- **Genre**: String field
- **Year**: Number field

1. Enter applicable data in each field
2. Click **Add Movie**
3. A message will either display a confirmation that the content has been added or an error message

## Edit Content 
1. Click the **Edit** button in the row respective to the comment you want to change
2. The **Edit Movie** modal will populate, allowing any of the populated fields to be changed
3. Make the desired changes and click **Save Changes**
4. A message will either display a confirmation that the edit was successful or an error message

## Reordering Lists 
### Method 1 
1. Click between the 4 dots on the left side of the row that you would like to reorder
2. Drag the row to the desired position

### Method 2
1. Click the **Edit** button in the row respective to the row that you'd like to reorder
2. The **Edit Movie** modal will populate, allowing the user to edit the rank
3. Update the rank to reflect the desired position and click **Save Changes**
4. A message will either display a confirmation that the edit was successful or an error message

## Delete Content 
1. Click the **Delete** button in the row respective to the comment you want to remove
2. A confirmation message will ask for confirmation
3. Click **OK**
4. A message will either display a confirmation that the content has been removed or an error message

## Import or Export Content
### Download Template
The Template is a blank `.csv` file having only headers. Click the **Download Template** button to download the Template for your selected media type.

| Media Type| File Name |
|-|-|
| Movies  | my-top-10-movies-template.csv  |
| Games    | my-top-10-movies-template.csv   |
| Shows    | my-top-10-movies-template.csv   |

### Export CSV
Click the **Export CSV** button to export the list respective to your chosen media type. 

| Media Type| File Name |
|-|-|
| Movies  | my-top-10-movies.csv  |
| Games    | my-top-10-movies.csv   |
| Shows    | my-top-10-movies.csv   |

### Import CSV
Click the **Import CSV** button to modify the list respective to your chosen media type. The import replaces all items on the list with the content that's included in the file, even if some rows remain the same.

#### File-level Rules
- The file must have 1 - 10 rows, not counting the header row
- Empty lines are ignored
- Quoted fields and commas inside quotes are supported

#### File Format
```csv
rank,title,genre,year
1,title,genre,year
2,title,genre,year
```

#### Field Restrictions

| Field | Required | Restrictions |
| - | - | - |
| rank | Yes | Interger from 1 - 10,  must be contigous |
| title | Yes | N/A |
| genre | Yes | N/A |
| year | Yes | Must be 4 digits between 1500 and the current calendar year|

## Download Shareable List Image
Click the **Download Image** button below the table respective of the selected content list that you would like to share. This will prompt you to save an image file which can be saved and shared.

| Media Type| File Name |
|-|-|
| Movies  | my-top-10-movies.png  |
| Games    | my-top-10-movies.png   |
| Shows    | my-top-10-movies.png   |


## Version History
**Note**: Only the previous 5 versions will be included in the version history.

### Version 4
- Added steps to export lists in image format according to product version 4.1
- Added steps to import and exprot lists according to product version 5

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
