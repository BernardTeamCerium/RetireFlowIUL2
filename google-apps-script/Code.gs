/**
 * RetireFlow IUL Leads: appends each landing-page lead to this spreadsheet.
 *
 * Setup (once):
 *   1. In the "RetireFlow IUL Leads" sheet: Extensions > Apps Script. Replace Code.gs with this file and save.
 *   2. Project Settings (gear) > Script Properties > Add property:
 *        SHEETS_SECRET = a long random string (use the same value in Vercel's SHEETS_SECRET)
 *   3. Deploy > New deployment > type "Web app":
 *        Execute as: Me    Who has access: Anyone
 *      Authorize when asked, then copy the Web app URL into Vercel's SHEETS_WEBHOOK_URL.
 *   If you edit this script later: Deploy > Manage deployments > edit > Version: New version.
 */

var SHEET_NAME = 'Leads';

var COLUMNS = [
  ['submitted_at', 'Submitted'],
  ['first_name', 'First Name'],
  ['last_name', 'Last Name'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['state', 'State'],
  ['priority', 'Most Important'],
  ['consent', 'Consent to Contact'],
  ['status', 'Status'],
  ['notes', 'Notes'],
  ['utm_source', 'UTM Source'],
  ['utm_medium', 'UTM Medium'],
  ['utm_campaign', 'UTM Campaign'],
  ['utm_content', 'UTM Content'],
  ['utm_term', 'UTM Term'],
  ['fbclid', 'FB Click ID'],
  ['page', 'Page'],
];

function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'Bad JSON' });
  }

  var secret = PropertiesService.getScriptProperties().getProperty('SHEETS_SECRET');
  if (!secret || data.secret !== secret) {
    return json({ ok: false, error: 'Unauthorized' });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = getSheet();
    var row = COLUMNS.map(function (c) {
      var key = c[0];
      if (key === 'submitted_at') return data.submitted_at ? new Date(data.submitted_at) : new Date();
      if (key === 'consent') return data.consent ? 'Yes' : 'No';
      if (key === 'status') return 'New';
      return safe(data[key]);
    });
    sheet.appendRow(row);
    sheet.getRange(sheet.getLastRow(), 1).setNumberFormat('mmm d, yyyy h:mm am/pm');
  } finally {
    lock.releaseLock();
  }
  return json({ ok: true });
}

// Uses the "Leads" tab, or renames the untouched default "Sheet1" to it. Adds the header row if missing.
function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    var first = ss.getSheets()[0];
    if (ss.getSheets().length === 1 && first.getLastRow() === 0) {
      sheet = first.setName(SHEET_NAME);
    } else {
      sheet = ss.insertSheet(SHEET_NAME);
    }
  }
  if (sheet.getLastRow() === 0) {
    var headers = COLUMNS.map(function (c) { return c[1]; });
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#041C3B')
      .setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);
    var statusRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['New', 'Contacted', 'Session Booked', 'Session Held', 'Not Interested', 'No Answer'], true)
      .setAllowInvalid(true)
      .build();
    sheet.getRange(2, 9, sheet.getMaxRows() - 1, 1).setDataValidation(statusRule);
  }
  return sheet;
}

// Stop values like "=HYPERLINK(...)" from running as formulas in the sheet.
function safe(value) {
  var s = value == null ? '' : String(value);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
