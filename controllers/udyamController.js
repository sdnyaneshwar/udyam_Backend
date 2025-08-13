import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let page;

// ----------------------
// Browser Loader
// ----------------------
const BrowserLoad = async (req, res, next) => {
  const browser = await puppeteer.launch({slowMo: 50 });
  page = await browser.newPage();

  await page.goto('https://udyamregistration.gov.in/UdyamRegistration.aspx', {
    timeout: 100000,
    waitUntil: 'networkidle0',
  });

  console.log("Full page load");
  next();
};

// ----------------------
// Aadhaar Verification
// ----------------------
const verifyAadhar = async (req, res) => {
  try {
    const { Aadhaar, Name } = req.body;
    console.log("Received Aadhaar and Name:", Aadhaar, Name);

    await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtadharno');
    await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtownername');

    // Clear previous inputs
    await page.evaluate(() => {
      document.querySelector('#ctl00_ContentPlaceHolder1_txtadharno').value = '';
      document.querySelector('#ctl00_ContentPlaceHolder1_txtownername').value = '';
    });

    await page.type('#ctl00_ContentPlaceHolder1_txtadharno', Aadhaar);
    await page.type('#ctl00_ContentPlaceHolder1_txtownername', Name);

    // Click the Validate Aadhaar button
    await page.click('#ctl00_ContentPlaceHolder1_btnValidateAadhaar');

    // Wait for OTP message
    await page.waitForFunction(() => {
      const el = document.querySelector('#ctl00_ContentPlaceHolder1_lblOtpRes1');
      return el && el.textContent.includes('OTP');
    }, { timeout: 15000 });

    const message = await page.$eval('#ctl00_ContentPlaceHolder1_lblOtpRes1', el => el.textContent.trim());
    const isOtpRes = message.toLowerCase().includes("otp");

    console.log({ message, isOtpRes });

    // 💾 Save to DB
    await prisma.aadhaarVerification.create({
      data: {
        aadhaar: Aadhaar,
        name: Name,
        otpSent: isOtpRes,
        otpVerified: false
      }
    });

    res.status(isOtpRes ? 200 : 400).json({ message, isOtpRes });

  } catch (error) {
    console.error("❌ Error in verifyAadhar:", error.message);

    let fallbackMessage = 'Unexpected error';
    try {
      fallbackMessage = await page.$eval('#ctl00_ContentPlaceHolder1_lblmsg', el => el.textContent.trim());
    } catch (_) { }

    res.status(400).json({ message: fallbackMessage, isOtpRes: false });
  }
};

// ----------------------
// OTP Verification
// ----------------------
const verifyOtp = async (req, res) => {
  try {
    const { otpValue, Aadhaar } = req.body;

    await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtOtp1');
    await page.type('#ctl00_ContentPlaceHolder1_txtOtp1', "");
    await page.type('#ctl00_ContentPlaceHolder1_txtOtp1', otpValue);

    await page.waitForSelector('#ctl00_ContentPlaceHolder1_btnValidate');
    await page.click('#ctl00_ContentPlaceHolder1_btnValidate');

    await page.waitForFunction(() => {
      const el = document.querySelector('#ctl00_ContentPlaceHolder1_lblmsg');
      return el && el.textContent.trim().length > 0;
    }, { timeout: 15000 });

    const message = await page.$eval('#ctl00_ContentPlaceHolder1_lblmsg', el => el.textContent.trim());

    // 💾 Update DB (otpVerified = true)
    await prisma.aadhaarVerification.updateMany({
      where: { aadhaar: Aadhaar },
      data: { otpVerified: true }
    });

    res.status(200).json({ message });

  } catch (error) {
    console.log("Error in verifyOtp:", error.message);
    res.status(400).json({ message: "Wrong OTP or verification failed" });
  }
};

// ----------------------
// PAN Verification
// ----------------------
const verifyPan = async (req, res) => {
  const { Organisation, PAN, Name, DOB } = req.body;
  console.log(Organisation, PAN, Name, DOB);

  try {
    await page.waitForSelector('#ctl00_ContentPlaceHolder1_ddlTypeofOrg');
    await page.select('#ctl00_ContentPlaceHolder1_ddlTypeofOrg', Organisation);
    await new Promise(resolve => setTimeout(resolve, 5000));

    await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtPan');
    await page.evaluate(() => { document.querySelector('#ctl00_ContentPlaceHolder1_txtPan').value = ''; });
    await page.type('#ctl00_ContentPlaceHolder1_txtPan', PAN, { delay: 100 });

    await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtPanName');
    await page.evaluate(() => { document.querySelector('#ctl00_ContentPlaceHolder1_txtPanName').value = ''; });
    await page.type('#ctl00_ContentPlaceHolder1_txtPanName', Name, { delay: 100 });

    await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtdob');
    await page.evaluate(() => { document.querySelector('#ctl00_ContentPlaceHolder1_txtdob').value = ''; });
    await page.type('#ctl00_ContentPlaceHolder1_txtdob', DOB, { delay: 100 });

    await page.waitForSelector('#ctl00_ContentPlaceHolder1_chkDecarationP');
    await page.click('#ctl00_ContentPlaceHolder1_chkDecarationP');

    await page.waitForSelector('#ctl00_ContentPlaceHolder1_btnValidatePan');
    await page.click('#ctl00_ContentPlaceHolder1_btnValidatePan');

    console.log('Filled the PAN form and clicked "PAN Validate".');
    await new Promise(resolve => setTimeout(resolve, 5000));

    await page.waitForSelector('#ctl00_ContentPlaceHolder1_lblPanError', { timeout: 10000 });

    const panVerificationMessage = await page.$eval(
      '#ctl00_ContentPlaceHolder1_lblPanError',
      span => span.innerText.trim()
    );

    // 💾 Save to DB
    await prisma.panVerification.create({
      data: {
        organisation: Organisation,
        pan: PAN,
        name: Name,
        dob: DOB,
        message: panVerificationMessage
      }
    });

    res.status(200).json({ message: panVerificationMessage });

  } catch (error) {
    console.error("Error in PAN verification:", error.message);
    res.status(400).json({ error: "PAN verification failed or fields invalid" });
  }
};

export { BrowserLoad, verifyAadhar, verifyOtp, verifyPan };
