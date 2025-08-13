import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Insert Aadhaar verification data
  const aadhaarRecord = await prisma.aadhaarVerification.create({
    data: {
      aadhaar: "364744921673",
      name: "Dnyaneshwar Rajkumar Suwarnkar",
      otpSent: true,
      otpVerified: false
    }
  });
  console.log("✅ Aadhaar record created:", aadhaarRecord);

  // Insert PAN verification data
  const panRecord = await prisma.panVerification.create({
    data: {
      organisation: "My Organisation Pvt Ltd",
      pan: "NVMPS9356H",
      name: "Dnyaneshwar Rajkumar Suwarnkar",
      dob: "25/03/2004",
      message: "PAN Verified Successfully"
    }
  });
  console.log("✅ PAN record created:", panRecord);
}

main()
  .catch(err => console.error(err))
  .finally(async () => {
    await prisma.$disconnect();
  });
