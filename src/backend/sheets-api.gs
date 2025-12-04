var SHEET_PRODUCTS = "Products";
var SHEET_ORDERS = "Orders";
var SHEET_REVIEWS = "Reviews";
var SHEET_TIPS = "Tips";

function getSheetByName(name) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sheet) {
    throw new Error("Sheet not found: " + name);
  }
  return sheet;
}

function sheetToObjects(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return [];
  }
  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[String(headers[j])] = row[j];
    }
    rows.push(obj);
  }
  return rows;
}

function upsertRowByKey(sheetName, keyColumn, keyValue, data) {
  var sheet = getSheetByName(sheetName);
  var range = sheet.getDataRange();
  var values = range.getValues();
  if (values.length === 0) {
    throw new Error("Sheet has no header row: " + sheetName);
  }
  var headers = values[0];
  var keyIndex = headers.indexOf(keyColumn);
  if (keyIndex === -1) {
    throw new Error("Key column not found: " + keyColumn);
  }

  var rowIndex = -1;
  for (var i = 1; i < values.length; i++) {
    if (values[i][keyIndex] === keyValue) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    rowIndex = values.length + 1;
  }

  var rowValues = [];
  for (var j = 0; j < headers.length; j++) {
    var key = String(headers[j]);
    if (data.hasOwnProperty(key)) {
      rowValues.push(data[key]);
    } else {
      if (rowIndex <= values.length) {
        rowValues.push(values[rowIndex - 1][j]);
      } else {
        rowValues.push("");
      }
    }
  }

  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
  return rowIndex;
}

function generatePublicOrderToken() {
  var raw = Utilities.getUuid();
  return raw.replace(/-/g, "").slice(0, 16);
}

function findOrderByPublicToken(token) {
  var sheet = getSheetByName(SHEET_ORDERS);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return null;
  }
  var headers = values[0];
  var tokenIndex = headers.indexOf("public_order_token");
  if (tokenIndex === -1) {
    return null;
  }

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (String(row[tokenIndex]) === String(token)) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[String(headers[j])] = row[j];
      }
      return obj;
    }
  }
  return null;
}

function productsToJson() {
  var sheet = getSheetByName(SHEET_PRODUCTS);
  var rows = sheetToObjects(sheet);
  return JSON.stringify(rows);
}

function reviewsToJson(productId) {
  var sheet = getSheetByName(SHEET_REVIEWS);
  var values = sheetToObjects(sheet);
  var filtered = [];
  for (var i = 0; i < values.length; i++) {
    var r = values[i];
    if (String(r.product_id) === String(productId) && String(r.approved) === "true") {
      filtered.push(r);
    }
  }
  return JSON.stringify(filtered);
}
