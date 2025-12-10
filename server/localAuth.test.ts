import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createMockContext(): TrpcContext {
  const cookies: Record<string, string> = {};
  
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      cookies,
    } as any,
    res: {
      cookie: (name: string, value: string) => {
        cookies[name] = value;
      },
      clearCookie: (name: string) => {
        delete cookies[name];
      },
    } as any,
  };
}

describe("localAuth", () => {
  it("회원가입 성공", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.localAuth.register({
      name: "테스트 사용자",
      email: `test${Date.now()}@example.com`,
      password: "test1234",
      phone: "010-1234-5678",
      accountNumber: "123-456-789",
    });

    expect(result).toEqual({ success: true });
  });

  it("로그인 성공", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // 먼저 회원가입
    const email = `test${Date.now()}@example.com`;
    await caller.localAuth.register({
      name: "테스트 사용자",
      email,
      phone: "010-1234-5678",
      password: "test1234",
    });

    // 로그인 시도
    const result = await caller.localAuth.login({
      email,
      password: "test1234",
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.email).toBe(email);
  });

  it("잘못된 비밀번호로 로그인 실패", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // 먼저 회원가입
    const email = `test${Date.now()}@example.com`;
    await caller.localAuth.register({
      name: "테스트 사용자",
      email,
      phone: "010-1234-5678",
      password: "test1234",
    });

    // 잘못된 비밀번호로 로그인 시도
    await expect(
      caller.localAuth.login({
        email,
        password: "wrongpassword",
      })
    ).rejects.toThrow();
  });

  it("로그아웃 성공", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.localAuth.logout();

    expect(result).toEqual({ success: true });
  });
});
