import nodemailer from "nodemailer";
import { ENV } from "./_core/env";

interface EmailParams {
  to: string;
  subject: string;
  content: string;
}

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (!ENV.smtpUser || !ENV.smtpPass) {
      console.warn("[Email] SMTP credentials not configured. Using test mode.");
    }

    transporter = nodemailer.createTransport({
      host: ENV.smtpHost,
      port: ENV.smtpPort,
      secure: false, // TLS
      auth: {
        user: ENV.smtpUser,
        pass: ENV.smtpPass,
      },
    });
  }
  return transporter;
}

/**
 * Send email using SMTP (Mailtrap)
 *
 * Environment variables required:
 * - SMTP_HOST: Mailtrap host (default: sandbox.smtp.mailtrap.io)
 * - SMTP_PORT: Mailtrap port (default: 2525)
 * - SMTP_USER: Mailtrap username
 * - SMTP_PASS: Mailtrap password
 * - SMTP_FROM: Sender email (default: noreply@spark.app)
 */
export async function sendEmail({ to, subject, content }: EmailParams): Promise<boolean> {
  try {
    console.log(`[Email] Attempting to send email to ${to}, subject: ${subject}`);

    if (!ENV.smtpUser || !ENV.smtpPass) {
      console.error("[Email] SMTP credentials not configured. Set SMTP_USER and SMTP_PASS environment variables.");
      return false;
    }

    const transport = getTransporter();

    const info = await transport.sendMail({
      from: ENV.smtpFrom,
      to,
      subject,
      text: content,
      html: content.replace(/\n/g, "<br>"),
    });

    console.log(`[Email] Successfully sent to ${to}, messageId: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`[Email] Failed to send email to ${to}:`, error?.message || error);
    return false;
  }
}

/**
 * Send event approval notification to organizer
 */
export async function sendEventApprovalEmail(
  organizerEmail: string,
  organizerName: string,
  eventTitle: string,
  eventDate: string | null,
  eventTimeRange: string | null
): Promise<boolean> {
  const subject = `모임 승인 알림: ${eventTitle}`;
  const content = `
안녕하세요, ${organizerName}님!

제안하신 모임이 승인되었습니다.

📌 모임 정보:
- 제목: ${eventTitle}
- 날짜: ${eventDate || "일시 미정"}
- 시간: ${eventTimeRange || "시간 미정"}

참여자들이 이제 이 모임에 신청할 수 있습니다.

감사합니다.
  `.trim();

  return await sendEmail({
    to: organizerEmail,
    subject,
    content,
  });
}

/**
 * Send registration confirmation to participant
 */
export async function sendRegistrationConfirmationEmail(
  participantEmail: string,
  participantName: string,
  eventTitle: string,
  eventDate: string | null,
  eventTimeRange: string | null,
  eventFee: number
): Promise<boolean> {
  const subject = `모임 신청 완료: ${eventTitle}`;
  const content = `
안녕하세요, ${participantName}님!

모임 신청이 완료되었습니다.

📌 신청 정보:
- 모임 제목: ${eventTitle}
- 날짜: ${eventDate || "일시 미정"}
- 시간: ${eventTimeRange || "시간 미정"}
- 참가비: ${eventFee === 0 ? "무료" : `${eventFee.toLocaleString()}원`}

모임 당일에 뵙겠습니다!

감사합니다.
  `.trim();

  return await sendEmail({
    to: participantEmail,
    subject,
    content,
  });
}

/**
 * Send event confirmation notification (when minimum participants reached)
 */
export async function sendEventConfirmationEmail(
  recipientEmail: string,
  recipientName: string,
  eventTitle: string,
  eventDate: string | null,
  eventTimeRange: string | null,
  eventFee: number,
  currentParticipants: number
): Promise<boolean> {
  const subject = `🎉 모임 확정 알림: ${eventTitle}`;
  const content = `
안녕하세요, ${recipientName}님!

신청하신 모임이 최소 인원을 달성하여 확정되었습니다!

📌 확정된 모임 정보:
- 모임 제목: ${eventTitle}
- 날짜: ${eventDate || "일시 미정"}
- 시간: ${eventTimeRange || "시간 미정"}
- 참가비: ${eventFee === 0 ? "무료" : `${eventFee.toLocaleString()}원`}
- 현재 참여 인원: ${currentParticipants}명

모임 당일에 뵙겠습니다!

감사합니다.
  `.trim();

  return await sendEmail({
    to: recipientEmail,
    subject,
    content,
  });
}


/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  recipientEmail: string,
  resetLink: string
): Promise<boolean> {
  const subject = `비밀번호 재설정 요청`;
  const content = `
안녕하세요!

비밀번호 재설정을 요청하셨습니다.

아래 링크를 클릭하여 새로운 비밀번호를 설정해주세요:
${resetLink}

이 링크는 1시간 동안 유효합니다.

비밀번호 재설정을 요청하지 않으셨다면 이 이메일을 무시하세요.

감사합니다.
  `.trim();

  return await sendEmail({
    to: recipientEmail,
    subject,
    content,
  });
}

/**
 * Send password changed notification email
 */
export async function sendPasswordChangedEmail(
  recipientEmail: string,
  recipientName: string
): Promise<boolean> {
  const subject = `비밀번호가 변경되었습니다`;
  const content = `
안녕하세요, ${recipientName}님!

회원님의 비밀번호가 성공적으로 변경되었습니다.

변경 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}

본인이 변경하지 않은 경우 즉시 고객센터로 문의해주세요.

감사합니다.
  `.trim();

  return await sendEmail({
    to: recipientEmail,
    subject,
    content,
  });
}

/**
 * Send announcement notification to event participant
 */
export async function sendParticipantNotification(
  participantEmail: string,
  participantName: string,
  eventTitle: string,
  eventDate: string | null,
  eventTimeRange: string | null,
  notificationSubject: string,
  notificationContent: string,
  eventUrl: string
): Promise<boolean> {
  const subject = `[SPARK] ${eventTitle} - ${notificationSubject}`;
  const content = `
안녕하세요, ${participantName}님

${eventTitle} 모임의 새로운 공지입니다.

────────────────────────────
${notificationContent}
────────────────────────────

📌 모임 정보:
- 일시: ${eventDate || "일시 미정"} ${eventTimeRange || ""}
- 장소: 온라인

모임 상세 보기: ${eventUrl}
────────────────────────────
  `.trim();

  return await sendEmail({
    to: participantEmail,
    subject,
    content,
  });
}
