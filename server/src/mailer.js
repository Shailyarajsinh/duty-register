import nodemailer from "nodemailer";
import "dotenv/config";

let transporter = null;

function getTransporter() {
  if (!transporter) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error("SMTP not configured — set SMTP_USER and SMTP_PASS in server/.env");
    }
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export async function sendOtpEmail(to, otp, officerName) {
  const t = getTransporter();
  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: "Duty Register — PIN Reset Code",
    text: `Hi ${officerName},\n\nYour PIN reset code is: ${otp}\n\nThis code expires in 10 minutes. If you didn't request this, ignore this email.`,
  });
}
