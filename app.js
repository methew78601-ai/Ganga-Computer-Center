require('dotenv').config(); // Load .env variables
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const session = require("express-session");
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { PDFDocument: PDFLibDocument } = require('pdf-lib');
const Jimp = require('jimp');

const app = express();

/* ================= QR CODE HELPER ================= */
async function addQRCodeToCertificate(filePath, studentData) {
  try {
    const qrText = `Name: ${studentData.name}\nReg No: ${studentData.regNumber}\nDOB: ${studentData.dob}\nEmail: ${studentData.email}`;
    
    const qrBuffer = await QRCode.toBuffer(qrText, { width: 300, margin: 0 });
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.pdf') {
      const pdfBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFLibDocument.load(pdfBytes);
      const qrImage = await pdfDoc.embedPng(qrBuffer);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      
      const qrSize = width * 0.06; 
      const xPos = width * 0.65;
      const yPos = height * 0.17; 

      firstPage.drawImage(qrImage, {
        x: xPos, 
        y: yPos,
        width: qrSize,
        height: qrSize,
      });

      const modifiedPdfBytes = await pdfDoc.save();
      fs.writeFileSync(filePath, modifiedPdfBytes);

    } else if (['.jpg', '.jpeg', '.png', '.bmp', '.tiff'].includes(ext)) {
      const image = await Jimp.read(filePath);
      const qrImage = await Jimp.read(qrBuffer);
      
      const imgWidth = image.bitmap.width;
      const imgHeight = image.bitmap.height;

      const qrSize = Math.floor(imgWidth * 0.06);
      const x = Math.floor(imgWidth * 0.78);
      const y = Math.floor(imgHeight * 0.70);

      qrImage.resize(qrSize, qrSize);
      image.composite(qrImage, x, y);
      await image.writeAsync(filePath);
    }
  } catch (error) {
    console.error("Error adding QR code:", error);
  }
}

/* ================= PATHS ================= */
const DATA_DIR = path.join(__dirname, "data");
const STUDENTS_FILE = path.join(DATA_DIR, "students.json");
const ADMINS_FILE = path.join(DATA_DIR, "admins.json");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const PUBLIC_DIR = path.join(__dirname, "public");

/* ================= ENSURE FILES ================= */
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

if (!fs.existsSync(STUDENTS_FILE))
  fs.writeFileSync(STUDENTS_FILE, JSON.stringify([], null, 2));

if (!fs.existsSync(ADMINS_FILE)) {
  fs.writeFileSync(
    ADMINS_FILE,
    JSON.stringify(
      [
        {
          username: "Saif Siddiqui",
          password: "S@!F786rs",
          role: "super"
        }
      ],
      null,
      2
    )
  );
}

/* ================= APP SETUP ================= */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/public", express.static(PUBLIC_DIR));
app.use("/uploads", express.static(UPLOADS_DIR));

/* ================= DOWNLOAD ROUTE ================= */
app.get("/download/:filename", (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);
  res.download(filePath, (err) => {
    if (err) {
      res.status(404).send("File not found");
    }
  });
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret",
    resave: false,
    saveUninitialized: false
  })
);

/* ================= STATIC DATA ================= */
const popularCourses = [
  { icon: "fas fa-globe", title: "Website Design And Development", desc: "Learn to build responsive websites." },
  { icon: "fas fa-code", title: "Programming", desc: "Learn logics & coding." },
  { icon: "fas fa-calculator", title: "Accounting", desc: "Learn Tally, GST." },
  { icon: "fas fa-paint-brush", title: "Graphic Design", desc: "Photoshop, Canva." }
];

const reviews = [
  { name: "Navneet", msg: "Great place to learn!", img: "/public/images/stduentFemale.avif" },
  { name: "Amar", msg: "Best learning experience!", img: "/public/images/stuentMale1.avif" },
  { name: "Amit", msg: "Very helpful classes!", img: "/public/images/studentM2.jpg" }
];

const stats = { years: 13, students: 10999, courses: 10, websites: 5 };

/* ================= HELPERS ================= */
const readJSON = file => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }
};

const writeJSON = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2));

const loadStudents = () => readJSON(STUDENTS_FILE);
const saveStudents = data => writeJSON(STUDENTS_FILE, data);

const loadAdmins = () => readJSON(ADMINS_FILE);
const saveAdmins = data => writeJSON(ADMINS_FILE, data);

const requireAdmin = (req, res, next) => {
  if (req.session.isAdmin) return next();
  res.redirect("/admin/login");
};

const requireSuperAdmin = (req, res, next) => {
  if (req.session.adminRole === "super") return next();
  res.redirect("/admin/dashboard");
};

/* ================= MULTER ================= */
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS_DIR),
  filename: (_, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_"))
});
const upload = multer({ storage });

/* ================= ROOT ================= */
app.get("/", (req, res) => res.redirect("/home"));

/* ================= PUBLIC PAGES ================= */
app.get("/home", (req, res) =>
  res.render("home", { popularCourses, reviews, stats })
);

app.get("/course", (req, res) => res.render("course"));
app.get("/about", (req, res) => res.render("about"));
app.get("/contact", (req, res) => res.render("contact"));

/* ================= STUDENT ================= */
app.get("/student/login", (req, res) =>
  res.render("student_portal", { error: null })
);

app.post("/student/check", (req, res) => {
  const { regNumber, dob } = req.body;
  const student = loadStudents().find(
    s => s.regNumber === regNumber && s.dob === dob
  );

  if (!student) return res.render("not_found");

  const ext = student.certificatePath
    ? path.extname(student.certificatePath).toLowerCase()
    : "";

  res.render("student_view", { student, ext });
});

/* ================= ADMIN LOGIN ================= */
app.get("/admin/login", (req, res) =>
  res.render("admin_login", { error: null })
);

app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  const admin = loadAdmins().find(
    a => a.username === username && a.password === password
  );

  if (!admin)
    return res.render("admin_login", { error: "Invalid username or password" });

  req.session.isAdmin = true;
  req.session.adminUser = admin.username;
  req.session.adminRole = admin.role;

  res.redirect("/admin/dashboard");
});

/* ================= ADMIN DASHBOARD ================= */
// ...rest of your routes remain same (no change needed)

/* ================= SERVER ================= */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`✅ Server running at http://localhost:${PORT}`)
);
