import express from "express";
import {
  BrowserLoad,
  verifyAadhar,
  verifyOtp,
  verifyPan
} from "../controllers/udyamController.js"; // Adjust path if needed

const router = express.Router();

// Aadhaar + Entrepreneur Name validation (Step 1)
router.post("/verify-aadhaar",BrowserLoad, verifyAadhar);

// OTP verification (Step 1 continuation)
router.post("/verify-otp", verifyOtp);

// PAN validation (Step 2)
router.post("/verify-pan", verifyPan);

export default router;
