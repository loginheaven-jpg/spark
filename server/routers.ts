import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { sendEventApprovalEmail, sendRegistrationConfirmationEmail, sendEventConfirmationEmail, sendPasswordResetEmail, sendPasswordChangedEmail } from "./email";
import { registerUser, verifyLogin } from "./auth";
import bcrypt from "bcrypt";
import crypto from "crypto";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  // 로컬 회원가입 및 로그인
  localAuth: router({
    register: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          email: z.string().email(),
          phone: z.string().min(1), // 필수
          password: z.string().min(6),
          accountNumber: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          await registerUser(input);
          return { success: true };
        } catch (error: any) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message || "회원가입에 실패했습니다.",
          });
        }
      }),

    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const user = await verifyLogin(input.email, input.password);

          // 세션 쿠키 설정
          const cookieOptions = getSessionCookieOptions(ctx.req);
          console.log('[Login Debug] Setting cookie for user:', user.id);
          console.log('[Login Debug] Cookie options:', cookieOptions);
          console.log('[Login Debug] Request hostname:', ctx.req.hostname);
          console.log('[Login Debug] Request protocol:', ctx.req.protocol);
          console.log('[Login Debug] Request headers:', ctx.req.headers);

          ctx.res.cookie("local_user_id", user.id.toString(), {
            ...cookieOptions,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30일
          });

          console.log('[Login Debug] Cookie set successfully');

          return {
            success: true,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              accountNumber: user.accountNumber || null,
            }
          };
        } catch (error: any) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: error.message || "로그인에 실패했습니다.",
          });
        }
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie("local_user_id", { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),

    me: publicProcedure.query(async ({ ctx }) => {
      console.log('[Me Debug] All cookies:', ctx.req.cookies);
      const localUserId = ctx.req.cookies?.local_user_id;
      console.log('[Me Debug] local_user_id cookie:', localUserId);

      if (!localUserId) {
        console.log('[Me Debug] No local_user_id cookie found');
        return null;
      }

      const userId = parseInt(localUserId, 10);
      if (isNaN(userId)) {
        console.log('[Me Debug] Invalid user ID:', localUserId);
        return null;
      }

      console.log('[Me Debug] Looking up user with ID:', userId);

      const user = await db.getUserById(userId);
      if (!user) {
        console.log('[Me Debug] User not found in database');
        return null;
      }

      console.log('[Me Debug] User found:', { id: user.id, name: user.name, email: user.email, role: user.role });
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        accountNumber: user.accountNumber || null,
        alwaysAvailable: user.alwaysAvailable ?? true,
      };
    }),

    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        accountNumber: z.string().optional(),
        alwaysAvailable: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUser(ctx.user.id, input);
        return { success: true };
      }),

    // 비밀번호 찾기
    forgotPassword: publicProcedure
      .input(z.object({
        email: z.string().email('유효한 이메일 주소를 입력해주세요.'),
      }))
      .mutation(async ({ input }) => {
        const { email } = input;

        // 사용자 조회
        const user = await db.getUserByEmail(email);

        // 사용자가 존재하지 않아도 동일한 응답 반환 (타이밍 공격 방지)
        if (!user) {
          // 가짜 해싱 작업으로 처리 시간 맞추기
          await bcrypt.hash('dummy-password', 10);

          return {
            success: true,
            message: '이메일을 확인해주세요. 비밀번호 재설정 링크를 발송했습니다.',
          };
        }

        // 기존 토큰 무효화
        await db.invalidateUserResetTokens(user.id);

        // 새 토큰 생성
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1시간 후

        // 토큰 저장
        await db.createResetToken(user.id, token, expiresAt);

        // 이메일 발송
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

        try {
          await sendPasswordResetEmail(user.email, resetLink);
        } catch (error) {
          console.error('[AUTH] Failed to send password reset email:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.',
          });
        }

        return {
          success: true,
          message: '이메일을 확인해주세요. 비밀번호 재설정 링크를 발송했습니다.',
        };
      }),

    // 비밀번호 재설정
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string(),
        newPassword: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다.'),
      }))
      .mutation(async ({ input }) => {
        const { token, newPassword } = input;

        // 토큰 조회
        const resetToken = await db.findResetToken(token);

        if (!resetToken) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '유효하지 않은 토큰입니다.',
          });
        }

        // 토큰 만료 확인
        if (new Date() > new Date(resetToken.expiresAt)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '만료된 토큰입니다. 비밀번호 찾기를 다시 시도해주세요.',
          });
        }

        // 토큰 사용 여부 확인
        if (resetToken.used) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '이미 사용된 토큰입니다.',
          });
        }

        // 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 비밀번호 업데이트
        await db.updateUserPassword(resetToken.userId, hashedPassword);

        // 토큰 무효화
        await db.invalidateResetToken(token);

        // 사용자 정보 조회
        const user = await db.getUserById(resetToken.userId);

        // 비밀번호 변경 알림 이메일 발송
        if (user) {
          try {
            await sendPasswordChangedEmail(user.email, user.name);
          } catch (error) {
            console.error('[AUTH] Failed to send password changed email:', error);
          }
        }

        return {
          success: true,
          message: '비밀번호가 성공적으로 변경되었습니다.',
        };
      }),

    // 비밀번호 변경 (로그인 상태)
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다.'),
      }))
      .mutation(async ({ ctx, input }) => {
        const { currentPassword, newPassword } = input;
        const userId = ctx.user.id;

        // 사용자 조회
        const user = await db.getUserById(userId);

        if (!user || !user.password) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: '사용자 정보를 찾을 수 없습니다.',
          });
        }

        // 현재 비밀번호 확인
        const isValid = await bcrypt.compare(currentPassword, user.password);

        if (!isValid) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: '현재 비밀번호가 일치하지 않습니다.',
          });
        }

        // 새 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 비밀번호 업데이트
        await db.updateUserPassword(userId, hashedPassword);

        // 비밀번호 변경 알림 이메일 발송
        try {
          await sendPasswordChangedEmail(user.email, user.name);
        } catch (error) {
          console.error('[AUTH] Failed to send password changed email:', error);
        }

        return {
          success: true,
          message: '비밀번호가 성공적으로 변경되었습니다.',
        };
      }),
  }),

  // OAuth auth 라우터 제거 - 로컬 로그인만 사용

  // ===== Available Slots (관리자 전용) =====
  availableSlots: router({
    list: publicProcedure.query(async () => {
      return await db.getAvailableSlots();
    }),

    create: adminProcedure
      .input(z.object({
        date: z.string(),
        startTime: z.string(),
        endTime: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.createAvailableSlot(input);
        return { success: true };
      }),

    // update: adminProcedure
    //   .input(z.object({
    //     id: z.number(),
    //     date: z.string().optional(),
    //     startTime: z.string().optional(),
    //     endTime: z.string().optional(),
    //     isAvailable: z.boolean().optional(),
    //   }))
    //   .mutation(async ({ input }) => {
    //     const { id, ...updates } = input;
    //     await db.updateAvailableSlot(id, updates);
    //     return { success: true };
    //   }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAvailableSlot(input.id);
        return { success: true };
      }),
  }),

  // ===== Events =====
  events: router({
    // 참여자용: 승인된 모임만 조회
    listApproved: publicProcedure.query(async () => {
      return await db.getApprovedEvents();
    }),

    // 관리자용: 모든 모임 조회
    listAll: adminProcedure.query(async () => {
      return await db.getAllEvents();
    }),

    // 주관자용: 내 모임 조회
    listMine: protectedProcedure.query(async ({ ctx }) => {
      return await db.getEventsByOrganizer(ctx.user.id);
    }),

    // 내가 개설한 모임 목록 (신청자 수 포함)
    myEvents: protectedProcedure.query(async ({ ctx }) => {
      return await db.getEventsByOrganizerWithCount(ctx.user.id);
    }),

    // 모임 상세 조회
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getEventById(input.id);
      }),

    // 모임 생성 (주관자 - 로컬 로그인 필요)
    create: publicProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        keywords: z.string().optional(),
        instructorName: z.string().optional(),
        fee: z.number().default(0),
        date: z.string().optional(),
        timeRange: z.string().optional(),
        isProposal: z.boolean().default(false),
        minParticipants: z.number().default(0),
        maxParticipants: z.number().default(0),
        organizerParticipates: z.boolean().default(true),
        eventStatus: z.enum(['proposal', 'scheduled', 'confirmed', 'completed']).optional(),
        materialUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 로컬 로그인 사용자 확인
        const localUserId = ctx.req.cookies?.local_user_id;
        if (!localUserId) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' });
        }

        const userId = parseInt(localUserId, 10);
        if (isNaN(userId)) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '유효하지 않은 세션입니다.' });
        }

        // Determine eventStatus
        const eventStatus = input.eventStatus
          ? input.eventStatus
          : (input.isProposal ? 'proposal' : 'scheduled');

        const result = await db.createEvent({
          organizerId: userId,
          status: 'pending',
          ...input,
          eventStatus,
          isProposal: input.isProposal ? 1 : 0,
          isConfirmed: eventStatus === 'confirmed' ? 1 : 0,
        });

        // 개설자가 참여하기로 선택한 경우 자동 등록
        if (input.organizerParticipates) {
          const user = await db.getUserById(userId);
          if (user) {
            // participant 레코드 생성 (또는 기존 레코드 찾기)
            const participant = await db.upsertParticipant({
              userId: userId,
              name: user.name,
              email: user.email,
              phone: user.phone || '',
            });

            if (participant) {
              // registration 등록 (result는 배열이 아니므로 직접 접근)
              const eventId = Number((result as any).insertId);
              if (eventId) {
                await db.createRegistration({
                  eventId: eventId,
                  participantId: participant.id,
                });
              }
            }
          }
        }

        return { success: true };
      }),

    // 모임 수정 (주관자 본인 또는 슈퍼 어드민)
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        keywords: z.string().optional(),
        instructorName: z.string().optional(),
        fee: z.number().optional(),
        date: z.string().optional(),
        timeRange: z.string().optional(),
        eventStatus: z.enum(['proposal', 'scheduled', 'confirmed', 'completed']).optional(),
        minParticipants: z.number().optional(),
        maxParticipants: z.number().optional(),
        materialUrl: z.string().optional(),
        materialContent: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 로컬 로그인 사용자 확인
        const localUserId = ctx.req.cookies?.local_user_id;
        if (!localUserId) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' });
        }

        const userId = parseInt(localUserId, 10);
        if (isNaN(userId)) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '유효하지 않은 세션입니다.' });
        }

        const user = await db.getUserById(userId);
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '사용자를 찾을 수 없습니다.' });
        }

        const event = await db.getEventById(input.id);
        if (!event) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '모임을 찾을 수 없습니다.' });
        }

        // 권한 확인: 주관자 본인 또는 슈퍼 어드민
        if (event.organizerId !== userId && user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '권한이 없습니다.' });
        }

        const { id, ...updates } = input;
        await db.updateEvent(id, updates);
        return { success: true };
      }),

    // 모임 삭제 (주관자 본인 또는 슈퍼 어드민)
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // 로컬 로그인 사용자 확인
        const localUserId = ctx.req.cookies?.local_user_id;
        if (!localUserId) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' });
        }

        const userId = parseInt(localUserId, 10);
        if (isNaN(userId)) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '유효하지 않은 세션입니다.' });
        }

        const user = await db.getUserById(userId);
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '사용자를 찾을 수 없습니다.' });
        }

        const event = await db.getEventById(input.id);
        if (!event) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '모임을 찾을 수 없습니다.' });
        }

        // 권한 확인: 주관자 본인 또는 슈퍼 어드민
        if (event.organizerId !== userId && user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '권한이 없습니다.' });
        }

        await db.deleteEvent(input.id);
        return { success: true };
      }),

    // 모임 승인/거부 (관리자)
    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['approved', 'rejected']),
      }))
      .mutation(async ({ input }) => {
        const event = await db.getEventById(input.id);
        if (!event) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '모임을 찾을 수 없습니다.' });
        }

        await db.updateEvent(input.id, { status: input.status });

        // Send email notification if approved
        if (input.status === 'approved') {
          const organizer = await db.getUserByOpenId(String(event.organizerId));
          if (organizer?.email && organizer?.name) {
            await sendEventApprovalEmail(
              organizer.email,
              organizer.name,
              event.title,
              event.date,
              event.timeRange
            );
          }
        }

        return { success: true };
      }),

    // 모임별 신청자 리스트 (관리자)
    getRegistrations: adminProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        return await db.getRegistrationsByEvent(input.eventId);
      }),
  }),

  // ===== Reviews =====
  reviews: router({
    create: protectedProcedure
      .input(z.object({
        eventId: z.number(),
        content: z.string().min(1),
        rating: z.number().min(1).max(5).default(5)
      }))
      .mutation(async ({ ctx, input }) => {
        // 중복 체크
        const existingReview = await db.getReviewByUserAndEvent(ctx.user.id, input.eventId);
        if (existingReview) {
          throw new TRPCError({ code: "CONFLICT", message: "이미 후기를 작성했습니다." });
        }

        // 참가자 여부 확인
        const isParticipant = await db.checkRegistrationExistsByUserId(input.eventId, ctx.user.id);
        if (!isParticipant) {
          throw new TRPCError({ code: "FORBIDDEN", message: "참가자만 후기를 작성할 수 있습니다." });
        }

        await db.createReview({
          eventId: input.eventId,
          userId: ctx.user.id,
          content: input.content,
          rating: input.rating,
        });
        return { success: true };
      }),

    list: publicProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        return await db.getReviewsByEvent(input.eventId);
      }),

    pending: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getPendingReviewEvent(ctx.user.id);
      }),
  }),

  // ===== Participants & Registrations =====
  participants: router({
    // 참여자 정보 등록/업데이트
    upsert: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const participant = await db.upsertParticipant(input);
        return participant;
      }),

    // 이메일로 참여자 조회
    getByEmail: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        return await db.getParticipantByEmail(input.email);
      }),

    // 모임 신청 (로그인 사용자)
    register: protectedProcedure
      .input(z.object({
        eventId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;

        // 중복 신청 체크
        const exists = await db.checkRegistrationExistsByUserId(input.eventId, userId);
        if (exists) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: '이미 신청한 모임입니다.' });
        }

        // userId로 participant 찾거나 생성
        const user = await db.getUserById(userId);
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '사용자 정보를 찾을 수 없습니다.' });
        }

        // 필수 정보 체크
        if (!user.name || !user.phone) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: '필수 정보(이름, 전화번호)를 먼저 입력해주세요.' });
        }

        const participant = await db.upsertParticipant({
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          userId: userId,
        });

        if (!participant) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '참여자 정보를 생성할 수 없습니다.' });
        }

        await db.createRegistration({
          eventId: input.eventId,
          participantId: participant.id,
        });

        // Send confirmation email to participant
        const event = await db.getEventById(input.eventId);

        if (event && participant?.email && participant?.name) {
          await sendRegistrationConfirmationEmail(
            participant.email,
            participant.name,
            event.title,
            event.date,
            event.timeRange,
            event.fee
          );
        }

        // Check if minimum participants reached for auto-confirmation
        if (event && event.minParticipants && event.minParticipants > 0 && !event.isConfirmed) {
          const registrations = await db.getRegistrationsByEvent(input.eventId);
          const currentCount = registrations.length;

          if (currentCount >= event.minParticipants) {
            // Mark event as confirmed
            await db.updateEvent(input.eventId, {
              isConfirmed: 1,
              eventStatus: 'confirmed'
            });

            // Send confirmation emails to all participants
            for (const reg of registrations) {
              if (reg.participantEmail && reg.participantName) {
                await sendEventConfirmationEmail(
                  reg.participantEmail,
                  reg.participantName,
                  event.title,
                  event.date,
                  event.timeRange,
                  event.fee,
                  currentCount
                );
              }
            }

            // Send confirmation email to organizer
            const organizer = await db.getUserById(event.organizerId);
            if (organizer?.email && organizer?.name) {
              await sendEventConfirmationEmail(
                organizer.email,
                organizer.name,
                event.title,
                event.date,
                event.timeRange,
                event.fee,
                currentCount
              );
            }
          }
        }

        return { success: true };
      }),

    // 내 신청 내역 조회 (로그인 사용자)
    myRegistrations: protectedProcedure.query(async ({ ctx }) => {
      return await db.getRegistrationsByUserId(ctx.user.id);
    }),

    // 참여 취소 (로그인 사용자)
    unregister: protectedProcedure
      .input(z.object({
        eventId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteRegistrationByUserId(input.eventId, ctx.user.id);
        return { success: true };
      }),

    // 모임별 참여자 목록 조회
    // 모임별 참여자 목록 조회 (권한별 정보 제한)
    listByEvent: publicProcedure
      .input(z.object({
        eventId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        const event = await db.getEventById(input.eventId);
        if (!event) return [];

        const participants = await db.getParticipantsByEvent(input.eventId);

        // 현재 로그인한 사용자 확인
        let currentUser = null;
        const localUserId = ctx.req.cookies?.local_user_id;
        if (localUserId) {
          const userId = parseInt(localUserId, 10);
          if (!isNaN(userId)) {
            currentUser = await db.getUserById(userId);
          }
        }

        // 1. 관리자: 모든 정보 공개
        if (currentUser?.role === 'admin') {
          return participants;
        }

        // 2. 모임 개설자: 전화번호 제외하고 공개
        if (currentUser && currentUser.id === event.organizerId) {
          return participants.map(p => ({
            ...p,
            phone: null, // 전화번호 숨김
          }));
        }

        // 3. 그 외 (일반 참여자/비로그인): 이름 마스킹, 이메일/전화번호 숨김
        return participants.map(p => {
          let maskedName = p.name || '알수없음';
          if (maskedName.length > 2) {
            // 3글자 이상: 김철수 -> 김*수
            maskedName = maskedName[0] + '*'.repeat(maskedName.length - 2) + maskedName[maskedName.length - 1];
          } else if (maskedName.length === 2) {
            // 2글자: 이영 -> 이*
            maskedName = maskedName[0] + '*';
          }

          // user 객체도 마스킹하거나 제거해야 함
          const user = p.user ? {
            ...p.user,
            name: maskedName,
            email: null,
            phone: null,
            password: null, // 보안상 제거
            openId: null,   // 보안상 제거
          } : null;

          return {
            ...p,
            name: maskedName,
            email: null,
            phone: null,
            user, // 마스킹된 사용자 정보 포함
          };
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
