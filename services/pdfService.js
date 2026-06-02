const puppeteer = require("puppeteer");
const {
  Result,
  ResultItem,
  Student,
  Department,
  Session,
  Semester,
  Course,
  Year,
  Exam,
  Class,
  CertificateTemplate,
  SchoolSettings
} = require("../models");

const escapeHtml = (value) => {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const formatDate = (value) => {
  if (!value) {
    return "N/A";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const buildHtml = ({
  studentName,
  registrationNumber,
  departmentName,
  yearName,
  examName,
  className,
  verificationCode,
  issuedAt,
  courses,
  totalScore,
  averageScore,
  templateHtml,
  schoolName,
  schoolLogo,
  registrarSignature,
  principalSignature
}) => {
  // Use default school name if not provided
  const safeSchoolName = schoolName || "SCHOOL NAME";
  
  // Prepare Logo HTML
  const logoHtml = schoolLogo 
    ? `<img src="${schoolLogo}" alt="Logo" style="max-height: 80px; max-width: 80px; display: block; margin: 0 auto;" />` 
    : `<div style="font-size: 24px; font-weight: bold; color: #1e3a8a;">${escapeHtml(safeSchoolName.charAt(0))}</div>`;

  // Prepare Signatures HTML (Standardized Sizing)
  const getSignatureHtml = (path, label) => {
    if (!path) return `<div style="width: 200px; border-bottom: 1px solid #333; margin-bottom: 10px;"></div><p style="font-size: 14px; font-weight: bold; margin: 0;">${label}</p>`;
    
    return `
      <div style="text-align: center;">
        <img src="${path}" alt="${label}" style="max-height: 60px; max-width: 180px; display: block; margin: 0 auto;" />
        <div style="width: 200px; border-bottom: 1px solid #333; margin: 10px auto;"></div>
        <p style="font-size: 14px; font-weight: bold; margin: 0;">${label}</p>
      </div>
    `;
  };

  const registrarSigHtml = getSignatureHtml(registrarSignature, "Registrar");
  const principalSigHtml = getSignatureHtml(principalSignature, "Principal");

  // If a custom template is provided, use it
  if (templateHtml) {
    // Generate Course Table Rows (Matching Frontend Preview Style)
    const courseRows = courses
      .map(
        (course, index) => `
        <tr>
          <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">${index + 1}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">${escapeHtml(course.courseCode)}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">${escapeHtml(course.courseTitle)}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">${escapeHtml(course.score)}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">${escapeHtml(course.grade)}</td>
        </tr>
      `
      )
      .join("");

    const courseTable = `
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 20px;">
        <thead>
          <tr style="background-color: #f8fafc;">
            <th style="padding: 10px; text-align: left; border: 1px solid #e2e8f0; color: #1e3a8a;">#</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #e2e8f0; color: #1e3a8a;">Course Code</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #e2e8f0; color: #1e3a8a;">Course Title</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #e2e8f0; color: #1e3a8a;">Score</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #e2e8f0; color: #1e3a8a;">Grade</th>
          </tr>
        </thead>
        <tbody>
          ${courseRows}
        </tbody>
      </table>
    `;

    // Replace placeholders
    let finalHtml = templateHtml
      .replace(/{{STUDENT_NAME}}/g, escapeHtml(studentName))
      .replace(/{{REG_NUMBER}}/g, escapeHtml(registrationNumber))
      .replace(/{{DEPARTMENT}}/g, escapeHtml(departmentName))
      .replace(/{{CLASS}}/g, escapeHtml(className))
      .replace(/{{YEAR}}/g, escapeHtml(yearName))
      .replace(/{{EXAM_NAME}}/g, escapeHtml(examName))
      .replace(/{{TOTAL_SCORE}}/g, totalScore)
      .replace(/{{AVERAGE_SCORE}}/g, averageScore)
      .replace(/{{SERIAL_NUMBER}}/g, escapeHtml(verificationCode))
      .replace(/{{COURSE_TABLE}}/g, courseTable)
      .replace(/{{SCHOOL_NAME}}/g, escapeHtml(safeSchoolName))
      .replace(/{{SCHOOL_LOGO}}/g, logoHtml)
      .replace(/{{REGISTRAR_SIGNATURE}}/g, registrarSigHtml)
      .replace(/{{PRINCIPAL_SIGNATURE}}/g, principalSigHtml)
      .replace(/{{DATE}}/g, formatDate(issuedAt))
      .replace(/{{DATE_NOW}}/g, formatDate(new Date()));

    // Ensure basic HTML structure if missing
    if (!finalHtml.trim().toLowerCase().startsWith("<!doctype html>")) {
      finalHtml = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Result Certificate</title>
          <style>
            body { margin: 0; padding: 0; background: #fff; font-family: sans-serif; }
            * { box-sizing: border-box; }
            .signature-block { text-align: center; }
            .signature-line { width: 200px; border-bottom: 1px solid #333; margin: 5px auto; }
            .signature-label { font-size: 14px; font-weight: bold; }
          </style>
        </head>
        <body>
          ${finalHtml}
        </body>
      </html>`;
    }

    return finalHtml;
  }

  // Fallback to default template (Upgraded as requested)
  const rows = courses
    .map(
      (course, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(course.courseCode)}</td>
          <td>${escapeHtml(course.courseTitle)}</td>
          <td>${escapeHtml(course.score)}</td>
          <td>${escapeHtml(course.grade)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Academic Result Certificate</title>
        <style>
          * { box-sizing: border-box; }
          body { 
            font-family: "Times New Roman", serif; 
            color: #333; 
            margin: 0; 
            padding: 40px;
            background-color: #fff;
          }
          .container { 
            border: 8px double #8B4513; 
            padding: 40px; 
            min-height: 900px; 
            position: relative; 
            background: #fff;
          }
          
          /* Updated Header Style */
          .header { 
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            border-bottom: 2px solid #8B4513; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
            text-align: center;
          }
          
          .logo-img { 
            height: 100px; 
            width: auto; 
            margin-bottom: 15px;
            display: block;
          }
          
          .title h1 { 
            margin: 0; 
            font-size: 28px; 
            color: #8B4513; 
            text-transform: uppercase; 
            font-weight: bold;
            line-height: 1.2;
          }
          
          .title p { 
            margin: 10px 0 0; 
            font-size: 24px; 
            color: #333; 
            font-style: italic; 
            font-weight: bold;
          }
          
          .certification-text {
            text-align: center;
            margin: 20px 0;
            font-size: 16px;
          }
          
          .student-name {
            text-align: center;
            font-size: 32px;
            font-weight: bold;
            margin: 10px 0;
            color: #000;
          }
          
          .student-meta {
            text-align: center;
            font-size: 14px;
            margin-bottom: 30px;
            color: #555;
          }

          .results-box {
            border: 1px solid #ddd;
            padding: 20px;
            background: #fdfdfd;
            border-radius: 5px;
          }
          
          .results-header {
            text-align: center;
            font-weight: bold;
            text-transform: uppercase;
            color: #8B4513;
            margin-bottom: 15px;
            font-size: 14px;
          }

          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          th, td { padding: 12px 15px; border-bottom: 1px solid #eee; text-align: left; }
          th { background: #f9f9f9; color: #333; font-weight: bold; text-transform: uppercase; font-size: 12px; }
          tr:last-child td { border-bottom: none; }
          
          .summary { margin-top: 30px; display: flex; justify-content: center; gap: 40px; font-size: 16px; font-weight: bold; }
          
          .footer { 
            margin-top: 60px; 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-end; 
            padding: 0 40px;
          }
          .signature-line { 
            border-top: 1px solid #333; 
            width: 200px; 
            text-align: center; 
            padding-top: 10px; 
            font-size: 14px;
            margin-top: 10px;
          }
          
          .signature-img {
            max-height: 60px;
            max-width: 180px;
            display: block;
            margin: 0 auto;
          }
          
          .verification {
            text-align: center;
            font-size: 10px;
            color: #999;
            margin-top: 40px;
            border-top: 1px solid #eee;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${logoHtml}
            <div class="title">
              <h1>${escapeHtml(safeSchoolName)}</h1>
              <p>Semester Result</p>
            </div>
          </div>
          
          <div class="certification-text">This certifies that</div>
          <div class="student-name">${escapeHtml(studentName)}</div>
          <div class="student-meta">
            Registration No: <strong>${escapeHtml(registrationNumber)}</strong> • 
            Department: <strong>${escapeHtml(departmentName)}</strong> • 
            Class: <strong>${escapeHtml(className)}</strong>
          </div>

          <div class="results-box">
            <div class="results-header">
              ${escapeHtml(yearName)} • ${escapeHtml(examName)}
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 50px;">#</th>
                  <th style="width: 120px;">Course Code</th>
                  <th>Course Title</th>
                  <th style="width: 80px;">Score</th>
                  <th style="width: 80px;">Grade</th>
                </tr>
              </thead>
              <tbody>
                ${rows || "<tr><td colspan='5' style='text-align:center'>No results found</td></tr>"}
              </tbody>
            </table>
            
            <div class="summary">
              <span>Total Score: ${totalScore}</span>
              <span>Average: ${averageScore}</span>
            </div>
          </div>

          <div class="footer">
            <div class="signature-block">
              ${registrarSigHtml}
              <div class="signature-line">Registrar</div>
            </div>
            <div class="signature-block">
              ${principalSigHtml}
              <div class="signature-line">Principal</div>
            </div>
          </div>
          
          <div class="verification">
            Verified Certificate | Serial: ${escapeHtml(verificationCode)} | Issued: ${formatDate(issuedAt)}
          </div>
        </div>
      </body>
    </html>
  `;
};

const generateResultPdfBuffer = async (resultId) => {
  const result = await Result.findByPk(resultId, {
    include: [
      { model: Student },
      { model: Department },
      { model: Year },
      { model: Exam },
      { model: Class },
      { model: ResultItem, include: [{ model: Course }] }
    ]
  });

  if (!result) {
    const error = new Error("Result not found");
    error.status = 404;
    throw error;
  }

  // Fetch active template
  const activeTemplate = await CertificateTemplate.findOne({
    where: { isActive: true }
  });

  // Fetch School Settings
  const schoolSettings = await SchoolSettings.findOne({
    order: [["updatedAt", "DESC"]]
  });

  const courses = (result.ResultItems || []).map((item) => ({
    courseCode: item.Course ? item.Course.courseCode : "N/A",
    courseTitle: item.Course ? item.Course.name : "N/A",
    score: item.score,
    grade: item.grade
  }));

  // Calculate Stats
  const totalScore = courses.reduce((sum, c) => sum + Number(c.score || 0), 0);
  const averageScore = courses.length > 0 ? (totalScore / courses.length).toFixed(1) : "0.0";

  // Resolve paths
  let schoolLogo = null;
  let registrarSignature = null;
  let principalSignature = null;

  if (schoolSettings) {
    const port = process.env.PORT || 5002;
    const baseUrl = `http://localhost:${port}`;

    if (schoolSettings.schoolLogo) {
      schoolLogo = schoolSettings.schoolLogo.startsWith("/") 
        ? `${baseUrl}${schoolSettings.schoolLogo}` 
        : schoolSettings.schoolLogo;
    }
    
    if (schoolSettings.registrarSignature) {
      registrarSignature = schoolSettings.registrarSignature.startsWith("/")
        ? `${baseUrl}${schoolSettings.registrarSignature}`
        : schoolSettings.registrarSignature;
    }

    if (schoolSettings.principalSignature) {
      principalSignature = schoolSettings.principalSignature.startsWith("/")
        ? `${baseUrl}${schoolSettings.principalSignature}`
        : schoolSettings.principalSignature;
    }
  }

  const html = buildHtml({
    studentName: result.Student ? result.Student.fullName : "N/A",
    registrationNumber: result.Student ? result.Student.registrationNumber : "N/A",
    departmentName: result.Department ? result.Department.name : "N/A",
    yearName: result.Year ? result.Year.name : "N/A",
    examName: result.Exam ? result.Exam.name : "N/A",
    className: result.Class ? result.Class.name : "N/A",
    verificationCode: result.verificationCode || `CERT-${new Date().getFullYear()}-${String(result.id).substring(0, 8).toUpperCase()}`,
    issuedAt: result.issuedAt,
    courses,
    totalScore,
    averageScore,
    templateHtml: activeTemplate ? activeTemplate.templateHtml : null,
    schoolName: schoolSettings ? schoolSettings.schoolName : "International Technical Management Institute",
    schoolLogo,
    registrarSignature,
    principalSignature
  });

  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    ignoreHTTPSErrors: true
  });

  try {
    console.log("New Page...");
    const page = await browser.newPage();
    
    // Set a default timeout for all operations
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(30000);

    console.log("Setting Content...");
    // Optimization: 'domcontentloaded' is faster than 'networkidle0'
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 30000 });
    
    console.log("Generating PDF Buffer...");
    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" }
    });
    console.log("PDF Generated. Size:", buffer.length);
    return buffer;
  } catch (error) {
    console.error("Puppeteer Error:", error);
    throw error;
  } finally {
    await browser.close();
  }
};

const generateTokensPdfBuffer = async (tokens) => {
  // Fetch School Settings
  const schoolSettings = await SchoolSettings.findOne({
    order: [["updatedAt", "DESC"]]
  });

  const schoolName = schoolSettings ? schoolSettings.schoolName : "International Technical Management Institute";
  let schoolLogo = null;

  if (schoolSettings && schoolSettings.schoolLogo) {
     const port = process.env.PORT || 5002;
     const baseUrl = `http://localhost:${port}`;
     schoolLogo = schoolSettings.schoolLogo.startsWith("/") 
        ? `${baseUrl}${schoolSettings.schoolLogo}` 
        : schoolSettings.schoolLogo;
  }

  const logoHtml = schoolLogo 
    ? `<img src="${schoolLogo}" alt="Logo" style="max-height: 60px; max-width: 60px; display: block; margin: 0 auto 10px;" />` 
    : ``;

  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Access Tokens</title>
        <style>
          @page {
            margin: 40px;
            @bottom-center {
              content: "Page " counter(page) " of " counter(pages);
              font-size: 10px;
              color: #999;
            }
          }
          body { 
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; 
            padding: 20px; 
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          h1 { 
            margin: 0; 
            font-size: 24px; 
            color: #1e3a8a; 
            text-transform: uppercase;
            font-weight: 800;
          }
          h2 {
            margin: 5px 0 0;
            font-size: 18px;
            color: #555;
            font-weight: normal;
          }
          .meta {
            margin-top: 10px;
            font-size: 12px;
            color: #777;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px; 
            font-size: 14px;
          }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
          th, td { 
            border: 1px solid #ddd; 
            padding: 10px; 
            text-align: left; 
          }
          th { 
            background-color: #f1f5f9; 
            font-weight: bold; 
            color: #1e3a8a;
            text-transform: uppercase;
            font-size: 12px;
          }
          tr:nth-child(even) { background-color: #f8fafc; }
          .token-code { 
            font-family: "Courier New", Courier, monospace; 
            font-weight: bold; 
            letter-spacing: 1px; 
            font-size: 1.1em; 
            color: #0f172a;
          }
          .footer { 
            margin-top: 40px;
            text-align: center; 
            font-size: 10px; 
            color: #999; 
            border-top: 1px solid #eee;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoHtml}
          <h1>${escapeHtml(schoolName)}</h1>
          <h2>Access Token List</h2>
          <div class="meta">
            Generated on: ${new Date().toLocaleString()} | Total Tokens: ${tokens.length}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">#</th>
              <th>Token Code</th>
              <th>Expiry Date</th>
              <th style="width: 100px;">Max Usage</th>
            </tr>
          </thead>
          <tbody>
            ${tokens.map((t, i) => `
              <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td class="token-code">${escapeHtml(t.tokenCode)}</td>
                <td>${formatDate(t.expiresAt)}</td>
                <td>${t.maxUsage}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Confidential Document - Generated by Result Portal System
        </div>
      </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    ignoreHTTPSErrors: true
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const buffer = await page.pdf({ 
      format: "A4", 
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: '<div style="font-size: 10px; text-align: center; width: 100%; color: #999;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
      margin: { top: "20px", bottom: "40px", left: "20px", right: "20px" }
    });
    return buffer;
  } finally {
    await browser.close();
  }
};

module.exports = { generateResultPdfBuffer, generateTokensPdfBuffer };
