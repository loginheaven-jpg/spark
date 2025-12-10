import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { TRPCError } from "@trpc/server";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "local",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    accountNumber: null,
    passwordHash: null,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      cookies: { local_user_id: user.id.toString() },
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createNonAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "local",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    accountNumber: null,
    passwordHash: null,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      cookies: { local_user_id: user.id.toString() },
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("admin - available slots", () => {
  it("should allow admin to create available slot", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.availableSlots.create({
      date: "2025-12-10",
      startTime: "10:00",
      endTime: "12:00",
    });

    expect(result.success).toBe(true);
  });

  it("should prevent non-admin from creating available slot", async () => {
    const ctx = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.availableSlots.create({
        date: "2025-12-10",
        startTime: "10:00",
        endTime: "12:00",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("should list available slots for everyone", async () => {
    const ctx = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    const slots = await caller.availableSlots.list();

    expect(Array.isArray(slots)).toBe(true);
  });
});

describe("admin - event management", () => {
  it("should allow admin to approve event", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // First create an event as a regular user
    const userCtx = createNonAdminContext();
    const userCaller = appRouter.createCaller(userCtx);

    await userCaller.events.create({
      title: "Test Event",
      description: "Test Description",
      fee: 0,
      isProposal: true,
    });

    // Get the event
    const events = await caller.events.listAll();
    const testEvent = events.find((e) => e.title === "Test Event");

    if (testEvent) {
      const result = await caller.events.updateStatus({
        id: testEvent.id,
        status: "approved",
      });

      expect(result.success).toBe(true);
    }
  });

  it("should prevent non-admin from approving event", async () => {
    const ctx = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.events.updateStatus({
        id: 1,
        status: "approved",
      })
    ).rejects.toThrow(TRPCError);
  });
});
