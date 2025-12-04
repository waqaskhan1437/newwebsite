function handleNewReview(e) {
  var body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput("Invalid JSON").setMimeType(ContentService.MimeType.TEXT);
  }

  var productId = body.product_id;
  var rating = body.rating;
  var comment = body.comment || "";
  var name = body.name || "Anonymous";

  if (!productId || !rating) {
    return ContentService.createTextOutput("Missing fields").setMimeType(ContentService.MimeType.TEXT);
  }

  var sheet = getSheetByName(SHEET_REVIEWS);
  var lastRow = sheet.getLastRow();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  var rowValues = [];
  for (var i = 0; i < headers.length; i++) {
    var key = String(headers[i]);
    if (key === "review_id") {
      rowValues.push(Utilities.getUuid());
    } else if (key === "product_id") {
      rowValues.push(productId);
    } else if (key === "rating") {
      rowValues.push(rating);
    } else if (key === "comment") {
      rowValues.push(comment);
    } else if (key === "name") {
      rowValues.push(name);
    } else if (key === "created_at") {
      rowValues.push(new Date());
    } else if (key === "approved") {
      rowValues.push(false);
    } else {
      rowValues.push("");
    }
  }

  sheet.getRange(lastRow + 1, 1, 1, headers.length).setValues([rowValues]);

  return ContentService.createTextOutput("review_received").setMimeType(ContentService.MimeType.TEXT);
}

function handleNewTip(e) {
  var body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput("Invalid JSON").setMimeType(ContentService.MimeType.TEXT);
  }

  var orderId = body.order_id;
  var amount = body.amount;

  if (!orderId || !amount) {
    return ContentService.createTextOutput("Missing fields").setMimeType(ContentService.MimeType.TEXT);
  }

  var tipsSheet = getSheetByName(SHEET_TIPS);
  var ordersSheet = getSheetByName(SHEET_ORDERS);

  var tipsHeaders = tipsSheet.getRange(1, 1, 1, tipsSheet.getLastColumn()).getValues()[0];
  var lastTipRow = tipsSheet.getLastRow();
  var tipValues = [];
  for (var i = 0; i < tipsHeaders.length; i++) {
    var key = String(tipsHeaders[i]);
    if (key === "tip_id") {
      tipValues.push(Utilities.getUuid());
    } else if (key === "order_id") {
      tipValues.push(orderId);
    } else if (key === "amount") {
      tipValues.push(amount);
    } else if (key === "method") {
      tipValues.push(body.method || "Whop");
    } else if (key === "created_at") {
      tipValues.push(new Date());
    } else {
      tipValues.push("");
    }
  }
  tipsSheet.getRange(lastTipRow + 1, 1, 1, tipsHeaders.length).setValues([tipValues]);

  var values = ordersSheet.getDataRange().getValues();
  if (values.length > 1) {
    var headers = values[0];
    var idxOrderId = headers.indexOf("order_id");
    var idxTipsTotal = headers.indexOf("tips_total");
    for (var r = 1; r < values.length; r++) {
      if (String(values[r][idxOrderId]) === String(orderId)) {
        var current = Number(values[r][idxTipsTotal] || 0);
        values[r][idxTipsTotal] = current + Number(amount);
        ordersSheet.getRange(r + 1, 1, 1, headers.length).setValues([values[r]]);
        var tokenIndex = headers.indexOf("public_order_token");
        if (tokenIndex >= 0) {
          var token = values[r][tokenIndex];
          try {
            publishOrderJson(token);
          } catch (err2) {
            Logger.log("Failed to republish order JSON after tip: " + err2);
          }
        }
        break;
      }
    }
  }

  return ContentService.createTextOutput("tip_recorded").setMimeType(ContentService.MimeType.TEXT);
}
