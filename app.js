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
    
    // Initial buffer generation (high res for resizing)
    const qrBuffer = await QRCode.toBuffer(qrText, { width: 300, margin: 0 });
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.pdf') {
      const pdfBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFLibDocument.load(pdfBytes);
      const qrImage = await pdfDoc.embedPng(qrBuffer);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      
      // Calculate size and position
      // "Chota sa" -> 6% of width. 
      // Position: Next to "%" (approx 78% right, 24% from bottom)
      const qrSize = width * 0.06; 
      const xPos = width * 0.65;
      const yPos = height * 0.17; 

      firstPage.drawImage(qrImage, {
        x: xPos, 
        y: yPos, // In PDF, y=0 is bottom
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

      // Dynamic size for images: 6% of width
      const qrSize = Math.floor(imgWidth * 0.06);
      
      // Position: Next to "%" (approx 78% right, 70% from top)
      // Note: Jimp 0,0 is top-left
      // Adjusted slightly higher (0.70) to align with text line
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
      // If file not found or other error
      res.status(404).send("File not found");
    }
  });
});

app.use(
  session({
    secret: "ganga-secret-key",
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
app.get("/admin/dashboard", requireAdmin, (req, res) => {
  let students = loadStudents();

  // Search Logic
  const query = req.query.search ? req.query.search.toLowerCase() : null;
  if (query) {
    students = students.filter(s => 
      (s.name && s.name.toLowerCase().includes(query)) ||
      (s.fatherName && s.fatherName.toLowerCase().includes(query)) ||
      (s.contact1 && s.contact1.includes(query)) ||
      (s.contact2 && s.contact2.includes(query)) ||
      (s.regNumber && s.regNumber.toLowerCase().includes(query))
    );
  }

  res.render("admin_dashboard", {
    students,
    total: loadStudents().length, // Show total count of ALL students, not just filtered
    adminUser: req.session.adminUser,
    searchQuery: req.query.search || ''
  });
});

/* ================= FEES MANAGEMENT ================= */
app.get("/admin/fees/:regNumber", requireAdmin, (req, res) => {
  const students = loadStudents();
  const index = students.findIndex(s => s.regNumber === req.params.regNumber);
  
  if (index === -1) return res.redirect("/admin/dashboard");
  
  const student = students[index];
  let dataChanged = false;

  // Ensure feeHistory exists
  if (!student.feeHistory) {
    student.feeHistory = [];
  }

  // Auto-assign IDs to legacy transactions
  student.feeHistory.forEach((t, i) => {
    if (!t.id) {
      t.id = Date.now().toString() + "-" + i; // Unique ID
      dataChanged = true;
    }
  });

  if (dataChanged) {
    saveStudents(students);
  }

  res.render("admin_fees", { 
    student, 
    adminUser: req.session.adminUser,
    searchQuery: req.query.search || ''
  });
});

app.post("/admin/fees/update-total", requireAdmin, (req, res) => {
  const { regNumber, totalFees } = req.body;
  const students = loadStudents();
  const index = students.findIndex(s => s.regNumber === regNumber);

  if (index !== -1) {
    students[index].totalFees = totalFees;
    saveStudents(students);
    res.redirect("/admin/fees/" + regNumber);
  } else {
    res.redirect("/admin/dashboard");
  }
});

app.post("/admin/fees/update", requireAdmin, (req, res) => {
  const { regNumber, amount, date, day, remarks } = req.body;
  const students = loadStudents();
  const index = students.findIndex(s => s.regNumber === regNumber);

  if (index !== -1) {
    const student = students[index];
    const amountVal = Number(amount);
    
    // Update total submitted
    student.feesSubmitted = (Number(student.feesSubmitted) || 0) + amountVal;

    // Add to history
    if (!student.feeHistory) student.feeHistory = [];
    student.feeHistory.push({
      amount: amountVal,
      date,
      day,
      remarks,
      by: req.session.adminUser,
      timestamp: new Date().toISOString()
    });

    saveStudents(students);
    res.redirect("/admin/fees/" + regNumber);
  } else {
    res.redirect("/admin/dashboard");
  }
});

app.post("/admin/fees/edit-transaction", requireAdmin, (req, res) => {
  const { regNumber, transactionId, amount, date, day, remarks } = req.body;
  const students = loadStudents();
  const index = students.findIndex(s => s.regNumber === regNumber);

  if (index !== -1) {
    const student = students[index];
    if (student.feeHistory) {
      const transIndex = student.feeHistory.findIndex(t => t.id === transactionId);
      if (transIndex !== -1) {
        // Revert old amount from total
        const oldAmount = Number(student.feeHistory[transIndex].amount);
        student.feesSubmitted = (Number(student.feesSubmitted) || 0) - oldAmount;

        // Update transaction
        const newAmount = Number(amount);
        student.feeHistory[transIndex] = {
          ...student.feeHistory[transIndex],
          amount: newAmount,
          date,
          day,
          remarks,
          updatedBy: req.session.adminUser,
          updatedAt: new Date().toISOString()
        };

        // Add new amount to total
        student.feesSubmitted += newAmount;

        saveStudents(students);
      }
    }
    res.redirect("/admin/fees/" + regNumber);
  } else {
    res.redirect("/admin/dashboard");
  }
});

app.post("/admin/fees/delete-transaction", requireAdmin, (req, res) => {
  const { regNumber, transactionId } = req.body;
  const students = loadStudents();
  const index = students.findIndex(s => s.regNumber === regNumber);

  if (index !== -1) {
    const student = students[index];
    if (student.feeHistory) {
      const transIndex = student.feeHistory.findIndex(t => t.id === transactionId);
      if (transIndex !== -1) {
        // Deduct amount from total
        const oldAmount = Number(student.feeHistory[transIndex].amount);
        student.feesSubmitted = (Number(student.feesSubmitted) || 0) - oldAmount;

        // Remove transaction
        student.feeHistory.splice(transIndex, 1);
        
        saveStudents(students);
      }
    }
    res.redirect("/admin/fees/" + regNumber);
  } else {
    res.redirect("/admin/dashboard");
  }
});

/* ================= API: GET STUDENT DETAILS ================= */
app.get("/admin/get-student/:regNumber", requireAdmin, (req, res) => {
  const students = loadStudents();
  const student = students.find(s => s.regNumber === req.params.regNumber);

  if (student) {
    res.json({
      success: true,
      data: {
        name: student.name,
        dob: student.dob,
        email: student.email
      }
    });
  } else {
    res.json({ success: false, message: "Student not found" });
  }
});

/* ================= UPLOAD ================= */
app.get("/admin/upload", requireAdmin, (req, res) =>
  res.render("admin_upload", { error: null })
);

app.post(
  "/admin/upload",
  requireAdmin,
  upload.single("certificate"),
  async (req, res) => {
    const { name, regNumber, dob, email } = req.body;
    if (!name || !regNumber || !dob || !email || !req.file)
      return res.render("admin_upload", { error: "All fields required" });

    // ADD QR CODE
    await addQRCodeToCertificate(req.file.path, { name, regNumber, dob, email });

    const students = loadStudents();
    const existingIndex = students.findIndex(s => s.regNumber === regNumber);

    if (existingIndex !== -1) {
      // Update existing student with certificate
      
      // Delete old certificate if exists
      if (students[existingIndex].certificatePath) {
        const oldCertPath = path.join(__dirname, students[existingIndex].certificatePath);
        if (fs.existsSync(oldCertPath)) {
          try {
            fs.unlinkSync(oldCertPath);
          } catch (err) {
            console.error("Failed to delete old certificate:", err);
          }
        }
      }

      students[existingIndex].certificatePath = "/uploads/" + req.file.filename;
      students[existingIndex].uploadedAt = new Date().toLocaleString();
      // Optionally update name/email/dob if you want, but maybe keep original registration data?
      // Let's update them just in case they fixed a typo
      students[existingIndex].name = name;
      students[existingIndex].dob = dob;
      students[existingIndex].email = email;
    } else {
      // Create new student
      students.push({
        name,
        regNumber,
        dob,
        email,
        certificatePath: "/uploads/" + req.file.filename,
        uploadedAt: new Date().toLocaleString()
      });
    }

    saveStudents(students);
    res.redirect("/admin/dashboard");
  }
);

/* ================= DELETE STUDENT ================= */
app.post("/admin/delete", requireAdmin, (req, res) => {
  const students = loadStudents();
  const student = students.find(s => s.regNumber === req.body.regNumber);

  if (student) {
    // Delete certificate if exists
    if (student.certificatePath) {
      const certPath = path.join(__dirname, student.certificatePath);
      if (fs.existsSync(certPath)) {
        try {
          fs.unlinkSync(certPath);
        } catch (err) {
          console.error("Error deleting certificate:", err);
        }
      }
    }
    // Delete photo if exists
    if (student.photo) {
      const photoPath = path.join(__dirname, student.photo);
      if (fs.existsSync(photoPath)) {
        try {
          fs.unlinkSync(photoPath);
        } catch (err) {
          console.error("Error deleting photo:", err);
        }
      }
    }
    // Delete aadhaar if exists
    if (student.aadhaarPath) {
      const aadhaarPath = path.join(__dirname, student.aadhaarPath);
      if (fs.existsSync(aadhaarPath)) {
        try {
          fs.unlinkSync(aadhaarPath);
        } catch (err) {
          console.error("Error deleting aadhaar:", err);
        }
      }
    }
  }

  saveStudents(students.filter(s => s.regNumber !== req.body.regNumber));
  res.redirect("/admin/dashboard");
});

/* ================= DELETE CERTIFICATE ================= */
app.post("/admin/delete-certificate", requireAdmin, (req, res) => {
  const students = loadStudents();
  const index = students.findIndex(s => s.regNumber === req.body.regNumber);

  if (index !== -1) {
    const student = students[index];
    if (student.certificatePath) {
      const certPath = path.join(__dirname, student.certificatePath);
      if (fs.existsSync(certPath)) {
        try {
          fs.unlinkSync(certPath);
        } catch (err) {
          console.error("Failed to delete certificate:", err);
        }
      }
      student.certificatePath = null;
      student.uploadedAt = null;
      saveStudents(students);
    }
  }
  res.redirect("/admin/dashboard");
});

/* ================= ADMIN REGISTRATIONS ================= */
app.get("/admin/registrations", requireAdmin, (req, res) => {
  res.render("admin_registrations", {
    students: loadStudents(),
    adminUser: req.session.adminUser
  });
});

app.get("/admin/registrations/add", requireAdmin, (req, res) => {
  const students = loadStudents();
  let nextRegNum = "1001";
  
  if (students.length > 0) {
    // Extract numeric part from regNumber (assuming format is numeric or string-numeric)
    const maxReg = students.reduce((max, s) => {
      const num = parseInt(s.regNumber, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    
    if (maxReg > 0) {
      nextRegNum = (maxReg + 1).toString();
    }
  }

  res.render("admin_student_form", {
    mode: "add",
    student: { regNumber: nextRegNum },
    error: null
  });
});

app.post("/admin/registrations/add", requireAdmin, upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'aadhaar', maxCount: 1 }]), (req, res) => {
  const { regNumber, name, fatherName, dob, contact1, contact2, address, email, totalFees, feesSubmitted, course } = req.body;

  if (!regNumber || !name || !dob || !contact1) {
    return res.render("admin_student_form", {
      mode: "add",
      student: req.body,
      error: "Please fill all required fields (*)"
    });
  }

  const students = loadStudents();
  if (students.find(s => s.regNumber === regNumber)) {
    return res.render("admin_student_form", {
      mode: "add",
      student: req.body,
      error: "Registration Number already exists!"
    });
  }

  const newStudent = {
    regNumber,
    name,
    fatherName,
    dob,
    contact1,
    contact2,
    address,
    email,
    course,
    totalFees,
    feesSubmitted,
    photo: req.files['photo'] ? "/uploads/" + req.files['photo'][0].filename : null,
    aadhaarPath: req.files['aadhaar'] ? "/uploads/" + req.files['aadhaar'][0].filename : null,
    registeredAt: new Date().toLocaleString(),
    certificatePath: null // No certificate initially
  };

  students.push(newStudent);
  saveStudents(students);
  res.redirect("/admin/registrations");
});

app.get("/admin/registrations/edit/:regNumber", requireAdmin, (req, res) => {
  const students = loadStudents();
  const student = students.find(s => s.regNumber === req.params.regNumber);
  
  if (!student) return res.redirect("/admin/registrations");

  res.render("admin_student_form", {
    mode: "edit",
    student,
    error: null
  });
});

app.post("/admin/registrations/edit/:regNumber", requireAdmin, upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'aadhaar', maxCount: 1 }]), (req, res) => {
  const students = loadStudents();
  const studentIndex = students.findIndex(s => s.regNumber === req.params.regNumber);

  if (studentIndex === -1) return res.redirect("/admin/registrations");

  const { name, fatherName, dob, contact1, contact2, address, email, totalFees, feesSubmitted, course, existingPhoto } = req.body;

  // Handle Photo Update
  let photoPath = existingPhoto;
  if (req.files['photo']) {
    // Delete old photo
    if (students[studentIndex].photo) {
      const oldPhotoPath = path.join(__dirname, students[studentIndex].photo);
      if (fs.existsSync(oldPhotoPath)) {
        try { fs.unlinkSync(oldPhotoPath); } catch (err) { console.error("Failed to delete old photo:", err); }
      }
    }
    photoPath = "/uploads/" + req.files['photo'][0].filename;
  }

  // Handle Aadhaar Update
  let aadhaarPath = students[studentIndex].aadhaarPath;
  if (req.files['aadhaar']) {
    // Delete old Aadhaar
    if (students[studentIndex].aadhaarPath) {
      const oldAadhaarPath = path.join(__dirname, students[studentIndex].aadhaarPath);
      if (fs.existsSync(oldAadhaarPath)) {
        try { fs.unlinkSync(oldAadhaarPath); } catch (err) { console.error("Failed to delete old aadhaar:", err); }
      }
    }
    aadhaarPath = "/uploads/" + req.files['aadhaar'][0].filename;
  }

  const updatedStudent = {
    ...students[studentIndex],
    name,
    fatherName,
    dob,
    contact1,
    contact2,
    address,
    email,
    course,
    totalFees,
    feesSubmitted,
    photo: photoPath,
    aadhaarPath: aadhaarPath
  };

  students[studentIndex] = updatedStudent;
  saveStudents(students);
  res.redirect("/admin/registrations");
});

app.post("/admin/registrations/delete", requireAdmin, (req, res) => {
  const students = loadStudents();
  const student = students.find(s => s.regNumber === req.body.regNumber);

  if (student) {
    // Delete certificate if exists
    if (student.certificatePath) {
      const certPath = path.join(__dirname, student.certificatePath);
      if (fs.existsSync(certPath)) {
        try {
            fs.unlinkSync(certPath);
        } catch (err) {
            console.error("Error deleting certificate:", err);
        }
      }
    }
    // Delete photo if exists
    if (student.photo) {
      const photoPath = path.join(__dirname, student.photo);
      if (fs.existsSync(photoPath)) {
        try {
            fs.unlinkSync(photoPath);
        } catch (err) {
            console.error("Error deleting photo:", err);
        }
      }
    }
    // Delete aadhaar if exists
    if (student.aadhaarPath) {
      const aadhaarPath = path.join(__dirname, student.aadhaarPath);
      if (fs.existsSync(aadhaarPath)) {
        try {
            fs.unlinkSync(aadhaarPath);
        } catch (err) {
            console.error("Error deleting aadhaar:", err);
        }
      }
    }
  }

  saveStudents(students.filter(s => s.regNumber !== req.body.regNumber));
  res.redirect("/admin/registrations");
});

/* ================= DOWNLOAD RECORDS ================= */
app.get("/admin/download/excel", requireAdmin, async (req, res) => {
  const students = loadStudents();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Students');

  sheet.columns = [
    { header: 'Registration No', key: 'regNumber', width: 15 },
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Father Name', key: 'fatherName', width: 20 },
    { header: 'DOB', key: 'dob', width: 12 },
    { header: 'Contact 1', key: 'contact1', width: 15 },
    { header: 'Contact 2', key: 'contact2', width: 15 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'Course', key: 'course', width: 20 },
    { header: 'Total Fees', key: 'totalFees', width: 12 },
    { header: 'Fees Submitted', key: 'feesSubmitted', width: 15 },
    { header: 'Fees Pending', key: 'feesPending', width: 15 },
    { header: 'Certificate Status', key: 'certStatus', width: 18 },
    { header: 'Registration Date', key: 'registeredAt', width: 20 }
  ];

  students.forEach(s => {
    const total = Number(s.totalFees) || 0;
    const submitted = Number(s.feesSubmitted) || 0;
    const pending = total - submitted;
    const certStatus = s.certificatePath ? "Uploaded" : "Pending";

    sheet.addRow({
      ...s,
      feesPending: pending,
      certStatus: certStatus
    });
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename=' + 'students_data.xlsx'
  );

  await workbook.xlsx.write(res);
  res.end();
});

app.get("/admin/download/pdf", requireAdmin, (req, res) => {
  const students = loadStudents();
  const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=students_data.pdf');

  doc.pipe(res);

  doc.fontSize(18).text('Ganga Computer Center - Student Records', { align: 'center' });
  doc.moveDown();

  const tableTop = 100;
  let y = tableTop;

  // Headers
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text('Reg No', 20, y, { width: 60 });
  doc.text('Name', 80, y, { width: 90 });
  doc.text('Father Name', 170, y, { width: 90 });
  doc.text('Course', 260, y, { width: 90 });
  doc.text('Contact', 350, y, { width: 70 });
  doc.text('Submitted', 420, y, { width: 60 });
  doc.text('Pending', 480, y, { width: 60 });
  doc.text('Total', 540, y, { width: 60 });
  doc.text('Certificate', 600, y, { width: 70 });
  
  doc.moveDown(0.5);
  doc.moveTo(20, doc.y).lineTo(820, doc.y).stroke();
  y = doc.y + 10;

  doc.font('Helvetica');

  students.forEach(s => {
    if (y > 500) { // New page
      doc.addPage({ margin: 20, size: 'A4', layout: 'landscape' });
      y = 50;
    }

    const total = Number(s.totalFees) || 0;
    const submitted = Number(s.feesSubmitted) || 0;
    const pending = total - submitted;
    const certStatus = s.certificatePath ? "Uploaded" : "Pending";

    doc.text(s.regNumber || '-', 20, y, { width: 60 });
    doc.text(s.name || '-', 80, y, { width: 90 });
    doc.text(s.fatherName || '-', 170, y, { width: 90 });
    doc.text(s.course || '-', 260, y, { width: 90 });
    doc.text(s.contact1 || '-', 350, y, { width: 70 });
    doc.text(String(submitted), 420, y, { width: 60 });
    doc.text(String(pending), 480, y, { width: 60 });
    doc.text(String(total), 540, y, { width: 60 });
    doc.text(certStatus, 600, y, { width: 70 });
    
    y += 20;
    doc.moveTo(20, y - 5).lineTo(820, y - 5).strokeOpacity(0.2).stroke().strokeOpacity(1);
  });

  doc.end();
});

/* ================= ADMIN MANAGE ================= */
app.get("/admin/manage", requireAdmin, (req, res) => {
  res.render("admin_manage", {
    admins: loadAdmins(),
    adminUser: req.session.adminUser,
    currentRole: req.session.adminRole
  });
});

/* ADD ADMIN (SUPER ONLY) */
app.post("/admin/add", requireAdmin, requireSuperAdmin, (req, res) => {
  const admins = loadAdmins();
  if (!admins.find(a => a.username === req.body.username)) {
    admins.push({
      username: req.body.username,
      password: req.body.password,
      role: "admin"
    });
    saveAdmins(admins);
  }
  res.redirect("/admin/manage");
});

/* DELETE ADMIN (SUPER ONLY, NOT SUPER) */
app.post("/admin/delete-admin", requireAdmin, requireSuperAdmin, (req, res) => {
  let admins = loadAdmins();
  admins = admins.filter(
    a => a.username !== req.body.username && a.role !== "super"
  );
  saveAdmins(admins);
  res.redirect("/admin/manage");
});

/* MAKE SUPER ADMIN */
app.post("/admin/make-super", requireAdmin, requireSuperAdmin, (req, res) => {
  const admins = loadAdmins();
  const target = admins.find(a => a.username === req.body.username);
  if (target && target.role !== "super") {
    target.role = "super";
    saveAdmins(admins);
  }
  res.redirect("/admin/manage");
});

/* ================= LOGOUT ================= */
app.get("/admin/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/admin/login"));
});

/* ================= 404 ================= */
app.use((req, res) => res.status(404).render("not_found"));

/* ================= SERVER ================= */
const PORT = 8080;
app.listen(PORT, () =>
  console.log(`✅ Server running at http://localhost:${PORT}`)
);
