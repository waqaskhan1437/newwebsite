function doPost(e) {
  var route = (e.parameter && e.parameter.route) || "whop";
  if (route === "whop") {
    return handleWhopWebhook(e);
  }
  if (route === "review_new") {
    return handleNewReview(e);
  }
  if (route === "tip_new") {
    return handleNewTip(e);
  }
  return ContentService.createTextOutput("Unknown route").setMimeType(ContentService.MimeType.TEXT);
}

function handleWhopWebhook(e) {
  var payload = {};
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput("Invalid JSON").setMimeType(ContentService.MimeType.TEXT);
  }

  var orderId = String(payload.id || payload.order_id || "");
  if (!orderId) {
    return ContentService.createTextOutput("Missing order id").setMimeType(ContentService.MimeType.TEXT);
  }

  var sheet = getSheetByName(SHEET_ORDERS);
  var values = sheet.getDataRange().getValues();
  if (values.length === 0) {
    return ContentService.createTextOutput("Orders sheet missing headers").setMimeType(ContentService.MimeType.TEXT);
  }

  var headers = values[0];
  var idxOrderId = headers.indexOf("whop_order_id");
  var idxPublicToken = headers.indexOf("public_order_token");
  var idxStatus = headers.indexOf("status");
  var idxAmount = headers.indexOf("amount");
  var idxCurrency = headers.indexOf("currency");
  var idxProductId = headers.indexOf("product_id");
  var idxProductTitle = headers.indexOf("product_title");
  var idxDeliveryEta = headers.indexOf("delivery_eta");
  var idxDeliveryLink = headers.indexOf("delivery_link");
  var idxDeliveryType = headers.indexOf("delivery_type");
  var idxCreatedAt = headers.indexOf("created_at");

  var rowIndex = -1;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idxOrderId]) === orderId) {
      rowIndex = i + 1;
      break;
    }
  }
  if (rowIndex === -1) {
    rowIndex = values.length + 1;
  }

  var token = (rowIndex <= values.length && values[rowIndex - 1][idxPublicToken]) || generatePublicOrderToken();
  var now = new Date();
  var row = values[rowIndex - 1] || [];

  row[idxOrderId] = orderId;
  if (idxPublicToken >= 0) row[idxPublicToken] = token;
  if (idxStatus >= 0) row[idxStatus] = payload.status || "paid";
  if (idxAmount >= 0) row[idxAmount] = payload.amount || row[idxAmount];
  if (idxCurrency >= 0) row[idxCurrency] = payload.currency || row[idxCurrency];
  if (idxProductId >= 0) row[idxProductId] = payload.product_id || row[idxProductId];
  if (idxProductTitle >= 0) row[idxProductTitle] = payload.product_title || row[idxProductTitle];
  if (idxDeliveryEta >= 0) row[idxDeliveryEta] = payload.delivery_eta || row[idxDeliveryEta];
  if (idxDeliveryLink >= 0) row[idxDeliveryLink] = payload.delivery_link || row[idxDeliveryLink];
  if (idxDeliveryType >= 0) row[idxDeliveryType] = payload.delivery_type || row[idxDeliveryType];
  if (idxCreatedAt >= 0 && !row[idxCreatedAt]) row[idxCreatedAt] = now;

  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([row]);

  try {
    publishOrderJson(token);
  } catch (err2) {
    Logger.log("Failed to publish order JSON: " + err2);
  }

  return ContentService.createTextOutput("ok").setMimeType(ContentService.MimeType.TEXT);
}
