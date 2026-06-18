function doGet(e) {
  var stockNumber = e.parameter.stock;
  var mainFolderId = "1gzyW8xf-stJQEToFOI8vBCFrrCN1_kb1"; // Your main folder ID
  
  if (!stockNumber) {
    return ContentService.createTextOutput(JSON.stringify({error: "No stock number provided"})).setMimeType(ContentService.MimeType.JSON);
  }
  
  try {
    // 🔍 Deep recursive search across the main folder and all its category/N/J subfolders
    // It filters specifically for your stock number inside the image titles
    var searchString = "title contains '" + stockNumber + "' and mimeType contains 'image/' and trashed = false";
    var files = DriveApp.getFolderById(mainFolderId).searchFiles(searchString);
    
    if (files.hasNext()) {
      var file = files.next();
      
      // Open up file sharing permissions so WhatsApp's servers can pull and show the image
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      // Generate the clean, direct download asset link 
      var directImageUrl = "https://docs.google.com/uc?export=download&id=" + file.getId();
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        fileName: file.getName(),
        imageUrl: directImageUrl
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({success: false, message: "Stock number not found"})).setMimeType(ContentService.MimeType.JSON);
    }
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}
