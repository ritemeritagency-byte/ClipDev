# Connect ClipDevs Forms to Google Sheets

## 1) Create a Google Sheet
- Create a new Google Sheet.
- Rename the first tab to `Leads`.
- Add this header row in `Leads` (row 1):

`submitted_at | source_page | form_type | name | business | location | phone | website_type | role | stack | build_type | message`

## 2) Create Google Apps Script
- In the sheet: `Extensions` -> `Apps Script`
- Replace the default code with:

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Leads");
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: "Leads sheet not found" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var data = {};
  try {
    data = JSON.parse(e.postData.contents || "{}");
  } catch (err) {
    data = {};
  }

  sheet.appendRow([
    data.submitted_at || "",
    data.source_page || "",
    data.form_type || "",
    data.name || "",
    data.business || "",
    data.location || "",
    data.phone || "",
    data.website_type || "",
    data.role || "",
    data.stack || "",
    data.build_type || "",
    data.message || ""
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 3) Deploy Web App
- Click `Deploy` -> `New deployment`
- Type: `Web app`
- Execute as: `Me`
- Who has access: `Anyone`
- Deploy and copy the Web App URL

## 4) Paste URL in your site
- Open `script.js`
- Set:

```javascript
const GOOGLE_SHEET_WEBHOOK_URL = "PASTE_YOUR_WEB_APP_URL_HERE";
```

## 5) Test
- Submit:
  - Book Strategy form
  - Website Brief form
  - Collaboration form
- You should see a new row per submission in `Leads`.

