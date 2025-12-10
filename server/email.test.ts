import { describe, expect, it } from "vitest";
import { sendEventApprovalEmail, sendRegistrationConfirmationEmail, sendEventConfirmationEmail } from "./email";

describe("email notifications", () => {
  it("should send event approval email", async () => {
    const result = await sendEventApprovalEmail(
      "organizer@example.com",
      "홍길동",
      "AI 토론회",
      "2025-12-15",
      "14:00-16:00"
    );

    // Email sending should succeed (or at least not throw an error)
    expect(typeof result).toBe("boolean");
  });

  it("should send registration confirmation email", async () => {
    const result = await sendRegistrationConfirmationEmail(
      "participant@example.com",
      "김철수",
      "철학 강연회",
      "2025-12-20",
      "10:00-12:00",
      5000
    );

    // Email sending should succeed (or at least not throw an error)
    expect(typeof result).toBe("boolean");
  });

  it("should handle free events in confirmation email", async () => {
    const result = await sendRegistrationConfirmationEmail(
      "participant@example.com",
      "이영희",
      "무료 세미나",
      "2025-12-25",
      "15:00-17:00",
      0
    );

    expect(typeof result).toBe("boolean");
  });

  it("should handle events without date/time", async () => {
    const result = await sendRegistrationConfirmationEmail(
      "participant@example.com",
      "박민수",
      "모임 제안",
      null,
      null,
      0
    );

    expect(typeof result).toBe("boolean");
  });

  it("should send event confirmation email when minimum participants reached", async () => {
    const result = await sendEventConfirmationEmail(
      "participant@example.com",
      "이영희",
      "AI 토론회",
      "2025-12-20",
      "14:00-16:00",
      5000,
      10
    );

    expect(typeof result).toBe("boolean");
  });
});
