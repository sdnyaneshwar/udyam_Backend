import puppeteer from 'puppeteer';
let page;
const BrowserLoad = async (req, res, next) => {
  const browser = await puppeteer.launch({ headless: false,slowMo: 50 });

  page = await browser.newPage();

  await page.goto('https://udyamregistration.gov.in/UdyamRegistration.aspx', {
    timeout: 100000,
    waitUntil: 'networkidle0',
  });
  console.log("full page load");

  next();


}



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

    // ✅ Wait for OTP message to appear or change (no navigation!)
    await page.waitForFunction(() => {
      const el = document.querySelector('#ctl00_ContentPlaceHolder1_lblOtpRes1');
      return el && el.textContent.includes('OTP');
    }, { timeout: 15000 });

    // ✅ Extract the message
    const message = await page.$eval('#ctl00_ContentPlaceHolder1_lblOtpRes1', el => el.textContent.trim());

    const isOtpRes = message.toLowerCase().includes("otp");

    console.log({ message, isOtpRes });
    
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






const verifyOtp = async (req, res) => {
  try {
    const { otpValue } = req.body;
    
    await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtOtp1');
    await page.type('#ctl00_ContentPlaceHolder1_txtOtp1', otpValue);
    
    // Wait for and click the final validate button
    await page.waitForSelector('#ctl00_ContentPlaceHolder1_btnValidate');
    await page.click('#ctl00_ContentPlaceHolder1_btnValidate');
    
    // Wait for the success message to appear
    await page.waitForFunction(() => {
      const el = document.querySelector('#ctl00_ContentPlaceHolder1_lblmsg');
      return el && el.textContent.trim().length > 0;
    }, { timeout: 15000 });

    // Get the success message text
    const message = await page.$eval('#ctl00_ContentPlaceHolder1_lblmsg', el => el.textContent.trim());
    res.status(200).json({ message });
    
  } catch (error) {
    //     ctl00_ContentPlaceHolder1_lblOtp1
    
    console.log("Error in verifyOtp:", error.message);
    res.status(400).json({ message: "Wrong OTP or verification failed" });
  }
};




const verifyPan = async (req, res) => {
  const { Organisation, PAN, Name, DOB } = req.body;
  console.log(Organisation, PAN, Name, DOB);
  
  try {
    // Wait for and select the "Type of Organisation"
    await page.waitForSelector('#ctl00_ContentPlaceHolder1_ddlTypeofOrg');
    await page.select('#ctl00_ContentPlaceHolder1_ddlTypeofOrg', Organisation);
    
    // Ensure a pause for the form to update after dropdown selection
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // PAN Field
    await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtPan');
    await page.evaluate(() => {
      document.querySelector('#ctl00_ContentPlaceHolder1_txtPan').value = '';
    });
    await page.type('#ctl00_ContentPlaceHolder1_txtPan', PAN, { delay: 100 });
    
    // Name Field
    await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtPanName');
    await page.evaluate(() => {
      document.querySelector('#ctl00_ContentPlaceHolder1_txtPanName').value = '';
    });
    await page.type('#ctl00_ContentPlaceHolder1_txtPanName', Name, { delay: 100 });
    
    // DOB Field
    await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtdob');
    await page.evaluate(() => {
      document.querySelector('#ctl00_ContentPlaceHolder1_txtdob').value = '';
    });
    await page.type('#ctl00_ContentPlaceHolder1_txtdob', DOB, { delay: 100 });
    
    // Declaration checkbox
    await page.waitForSelector('#ctl00_ContentPlaceHolder1_chkDecarationP');
    await page.click('#ctl00_ContentPlaceHolder1_chkDecarationP');
    
    // Click the "Validate PAN" button
    await page.waitForSelector('#ctl00_ContentPlaceHolder1_btnValidatePan');
    await page.click('#ctl00_ContentPlaceHolder1_btnValidatePan');
    
    console.log('Filled the PAN form and clicked "PAN Validate".');
    await new Promise(resolve => setTimeout(resolve, 5000));
    // Wait for result message
    await page.waitForSelector('#ctl00_ContentPlaceHolder1_lblPanError', { timeout: 10000 });
    
    const panVerificationMessage = await page.$eval(
      '#ctl00_ContentPlaceHolder1_lblPanError',
      span => span.innerText.trim()
    );
    
    res.status(200).json({ message: panVerificationMessage });
    
  } catch (error) {
    console.error("Error in PAN verification:", error.message);
    res.status(400).json({ error: "PAN verification failed or fields invalid" });
  }
};










// const verifyOtp = async (req, res) => {
  //   try {
//     const { otpValue } = req.body

//     await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtOtp1');
//     await page.type('#ctl00_ContentPlaceHolder1_txtOtp1', otpValue);

//     // Wait for the final validate button and click it
//     await page.waitForSelector('#ctl00_ContentPlaceHolder1_btnValidate');
//     await page.click('#ctl00_ContentPlaceHolder1_btnValidate');
//     res.status(200).json("suceesfully verified")
//   } catch (error) {
  //     console.log("Error in verify otp");
//     res.status(400).json({ message: "wrong OTP" })
//   }
// }
// const verifyPan = async (req, res) => {
//   const { Organisation, PAN, Name, DOB } = req.body
//   console.log(Organisation, PAN, Name, DOB);
//   try {

//     // Wait for and select the "Type of Organisation" dropdown
//     await page.waitForSelector('#ctl00_ContentPlaceHolder1_ddlTypeofOrg');
//     await page.select('#ctl00_ContentPlaceHolder1_ddlTypeofOrg', Organisation);

//     // Wait for PAN input field, then clear and type
//     await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtPan');
//     await page.evaluate(() => {
  //       document.querySelector('#ctl00_ContentPlaceHolder1_txtPan').value = '';
  //     });
  //     await page.type('#ctl00_ContentPlaceHolder1_txtPan', PAN);
  
  //     // Wait for Name field, then clear and type
  //     await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtPanName');
  //     await page.evaluate(() => {
    //       document.querySelector('#ctl00_ContentPlaceHolder1_txtPanName').value = '';
    //     });
    //     await page.type('#ctl00_ContentPlaceHolder1_txtPanName', Name);
    
    //     // Wait for DOB field, then clear and type
    //     await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtdob');
    //     await page.evaluate(() => {
      //       document.querySelector('#ctl00_ContentPlaceHolder1_txtdob').value = '';
      //     });
      //     await page.type('#ctl00_ContentPlaceHolder1_txtdob', DOB);
      
      //     // Check the declaration checkbox
      //     await page.waitForSelector('#ctl00_ContentPlaceHolder1_chkDecarationP');
      //     await page.click('#ctl00_ContentPlaceHolder1_chkDecarationP');
      
      //     // Click the final "PAN Validate" button
      //     await page.waitForSelector('#ctl00_ContentPlaceHolder1_btnValidatePan');
      //     await page.click('#ctl00_ContentPlaceHolder1_btnValidatePan');

      //     console.log('Filled the PAN form and clicked "PAN Validate".');
      
      //     // Wait for the PAN verification message to appear
      //     await page.waitForSelector('#ctl00_ContentPlaceHolder1_lblPanError');
      
      //     // Get the text content of the span and store it in a variable
      //     const panVerificationMessage = await page.$eval('#ctl00_ContentPlaceHolder1_lblPanError', span => span.innerText);
      //     res.status(200).json(panVerificationMessage)
      //   } catch (error) {
        //     console.log("Error Pan not valid")
        //     res.status(200).json({ error: "Pan not valid" })
        //   }
        // }

// const all = async () => {
//   // const verifyAadhar = async (req, res) => {
//   //   try {
//   //     const {Aadhaar ,Name }=req.body
  
//   //     console.log(Aadhaar,Name);
  
  
//   //     await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtadharno');
//   //     await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtownername');
  
//   //     // Fill the Aadhaar Number field
//   //     await page.type('#ctl00_ContentPlaceHolder1_txtadharno', Aadhaar);
  
//   //     // Fill the Name of Entrepreneur field
//   //     await page.type('#ctl00_ContentPlaceHolder1_txtownername', Name);
  
//   //     await page.click('#ctl00_ContentPlaceHolder1_btnValidateAadhaar');
//   //     await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
  
//   //     await page.waitForFunction(() => {
//   //       const el = document.querySelector('#ctl00_ContentPlaceHolder1_lblOtpRes1');
//   //       return el && el.textContent.trim().length > 0;
//   //     }, { timeout: 10000 });
  
//   //     const message = await page.$eval('#ctl00_ContentPlaceHolder1_lblOtpRes1', el => el.textContent.trim());
  
//   //     isOtpRes = true;
//   //     console.log({ message: message, isOtpRes: true });
//   //     res.status(200).json({ message: message, isOtpRes: true })
  
//   //   } catch (error) {
//   //     await page.waitForSelector('#ctl00_ContentPlaceHolder1_lblmsg', { timeout: 5000 });
//   //     const message = await page.$eval('#ctl00_ContentPlaceHolder1_lblmsg', span => span.textContent);
//   //     console.log({ message: message, isOtpRes: false });
  
//   //     res.status(400).json({ message: message, isOtpRes: false })
//   //   }
  
//   // }
//   const browser = await puppeteer.launch({ headless: false });

//   const page = await browser.newPage();

//   await page.goto('https://udyamregistration.gov.in/UdyamRegistration.aspx', {
//     timeout: 100000,
//     waitUntil: 'networkidle0',
//   });

//   console.log("full page load");
//   await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtadharno');
//   await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtownername');

//   // Fill the Aadhaar Number field
//   await page.type('#ctl00_ContentPlaceHolder1_txtadharno', '123456789012');

//   // Fill the Name of Entrepreneur field
//   await page.type('#ctl00_ContentPlaceHolder1_txtownername', 'John Doe');

//   await page.click('#ctl00_ContentPlaceHolder1_btnValidateAadhaar');

//   // Wait for the OTP status message to appear
//   await page.waitForSelector('#ctl00_ContentPlaceHolder1_lblOtpRes1');

//   // Get the text content of the span and store it in a variable
//   const otpMessage = await page.$eval('#ctl00_ContentPlaceHolder1_lblOtpRes1', span => span.textContent);

//   console.log(otpMessage); // This will log "OTP has been sent to *******1932"

//   // Wait for the OTP input and fill it
//   await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtOtp1');
//   const otpValue = '123456'; // Replace with your actual OTP
//   await page.type('#ctl00_ContentPlaceHolder1_txtOtp1', otpValue);

//   // Wait for the final validate button and click it
//   await page.waitForSelector('#ctl00_ContentPlaceHolder1_btnValidate');
//   await page.click('#ctl00_ContentPlaceHolder1_btnValidate');



//   // Navigate and fill initial Aadhaar/Name form
//   // ... (Previous steps)

//   // After OTP validation click:
//   await page.waitForSelector('#ctl00_ContentPlaceHolder1_lblmsg');
//   const verificationMessage = await page.$eval('#ctl00_ContentPlaceHolder1_lblmsg', span => span.textContent);
//   console.log(verificationMessage);

//   // Wait for and select the "Type of Organisation" dropdown
//   await page.waitForSelector('#ctl00_ContentPlaceHolder1_ddlTypeofOrg');
//   await page.select('#ctl00_ContentPlaceHolder1_ddlTypeofOrg', '1'); // Selects "Proprietary"

//   // Wait for and fill the PAN fields
//   await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtPan');
//   await page.type('#ctl00_ContentPlaceHolder1_txtPan', 'ABCDE1234F'); // Replace with a valid PAN

//   await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtPanName');
//   await page.type('#ctl00_ContentPlaceHolder1_txtPanName', 'John Doe');

//   await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtdob');
//   await page.type('#ctl00_ContentPlaceHolder1_txtdob', '01/01/1990'); // Replace with valid DOB/DOI

//   // Check the declaration checkbox
//   await page.waitForSelector('#ctl00_ContentPlaceHolder1_chkDecarationP');
//   await page.click('#ctl00_ContentPlaceHolder1_chkDecarationP');

//   // Click the final "PAN Validate" button
//   await page.waitForSelector('#ctl00_ContentPlaceHolder1_btnValidatePan');
//   await page.click('#ctl00_ContentPlaceHolder1_btnValidatePan');

//   console.log('Filled the PAN form and clicked "PAN Validate".');

//   // Wait for the PAN verification message to appear
//   await page.waitForSelector('#ctl00_ContentPlaceHolder1_lblPanError');

//   // Get the text content of the span and store it in a variable
//   const panVerificationMessage = await page.$eval('#ctl00_ContentPlaceHolder1_lblPanError', span => span.innerText);

//   console.log('PAN Verification Message:');
//   console.log(panVerificationMessage);



// };


// export {
//   BrowserLoad, verifyAadhar, verifyOtp, verifyPan
// }