import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createMockContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("participants", () => {
  it("should upsert participant info", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const participant = await caller.participants.upsert({
      name: "홍길동",
      email: "test@example.com",
      phone: "010-1234-5678",
    });

    expect(participant).toBeDefined();
    expect(participant.name).toBe("홍길동");
    expect(participant.email).toBe("test@example.com");
    expect(participant.phone).toBe("010-1234-5678");
  });

  it("should get participant by email", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // First create a participant
    await caller.participants.upsert({
      name: "김철수",
      email: "kim@example.com",
      phone: "010-9876-5432",
    });

    // Then retrieve by email
    const participant = await caller.participants.getByEmail({
      email: "kim@example.com",
    });

    expect(participant).toBeDefined();
    expect(participant?.name).toBe("김철수");
  });

  it("should return null for non-existent email", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const participant = await caller.participants.getByEmail({
      email: "nonexistent@example.com",
    });

    expect(participant).toBeNull();
  });
});
