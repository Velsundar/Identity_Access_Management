import nodemailer, { Transporter } from "nodemailer";
import { env, isProduction } from "@/config/env";

let transporter: Transporter | null = null;

const getTransporter = (): Transporter | null => {
  if (!env.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
};

/**
 * Sends an OTP to the given address. When SMTP is not configured (typical in
 * development) the OTP is logged to the console so the flow remains usable.
 */
export const sendOtpEmail = async (to: string, otp: string): Promise<void> => {
  const tx = getTransporter();

  if (!tx) {
    if (isProduction) {
      throw new Error("SMTP is not configured; cannot send OTP email");
    }
    // eslint-disable-next-line no-console
    console.log(`[dev] OTP for ${to}: ${otp}`);
    return;
  }

  await tx.sendMail({
    from: env.smtp.from,
    to,
    subject: "Your Velos IAM verification code",
    text: `Your verification code is ${otp}. It expires in 5 minutes.`,
  });
};
