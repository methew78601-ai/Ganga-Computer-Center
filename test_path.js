const path = require('path');
const fs = require('fs');

const __dirname_test = "f:\\certififacate cursur\\ganga-project";
const certificatePath = "/uploads/testfile.txt";

const joinedPath = path.join(__dirname_test, certificatePath);
console.log("Joined Path:", joinedPath);

// Create a dummy file to test deletion
const uploadsDir = path.join(__dirname_test, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const testFilePath = path.join(uploadsDir, "testfile.txt");
fs.writeFileSync(testFilePath, "test content");

console.log("File exists before:", fs.existsSync(testFilePath));

// Try to delete using the joined path logic from app.js
if (fs.existsSync(joinedPath)) {
    console.log("File found at joined path. Deleting...");
    fs.unlinkSync(joinedPath);
    console.log("File deleted.");
} else {
    console.log("File NOT found at joined path:", joinedPath);
}

console.log("File exists after:", fs.existsSync(testFilePath));
