import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, DollarSign, CheckCircle2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

export default function EventDetailPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/event/:id");
  const eventId = params?.id ? parseInt(params.id, 10) : null;

  const { data: localUser } = trpc.localAuth.me.useQuery();
  const { data: event, isLoading } = trpc.events.getById.useQuery(
    { id: eventId! },
    { enabled: !!eventId }
  );
  const { data: participants } = trpc.participants.listByEvent.useQuery(
    { eventId: eventId! },
    { enabled: !!eventId }
  );
  const { data: myRegistrations } = trpc.participants.myRegistrations.useQuery(
    undefined,
    { enabled: !!localUser }
  );

  const registerForEvent = trpc.participants.register.useMutation();
  const unregisterFromEvent = trpc.participants.unregister.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!eventId) {
      toast.error("잘못된 접근입니다.");
      setLocation("/");
    }
  }, [eventId, setLocation]);

  const isRegistered = myRegistrations?.some(reg => reg.eventId === eventId) || false;

  const handleRegister = async () => {
    if (!localUser) {
      toast.error("로그인이 필요합니다.");
      setLocation("/");
      return;
    }

    if (!localUser.name || !localUser.phone) {
      toast.error("필수 정보를 먼저 입력해주세요.");
      setLocation("/profile");
      return;
    }

    try {
      await registerForEvent.mutateAsync({ eventId: eventId! });
      toast.success("모임 신청이 완료되었습니다!");
      utils.events.getById.invalidate();
      utils.participants.listByEvent.invalidate();
      utils.participants.myRegistrations.invalidate();
    } catch (error: any) {
      toast.error(error.message || "신청 중 오류가 발생했습니다.");
    }
  };

  const handleUnregister = async () => {
    if (confirm("참여를 취소하시겠습니까?")) {
      try {
        await unregisterFromEvent.mutateAsync({ eventId: eventId! });
        toast.success("참여가 취소되었습니다.");
        utils.events.getById.invalidate();
        utils.participants.listByEvent.invalidate();
        utils.participants.myRegistrations.invalidate();
      } catch (error: any) {
        toast.error(error.message || "취소 중 오류가 발생했습니다.");
      }
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "일시 미정";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">모임 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-12">
            <p className="text-slate-600">모임을 찾을 수 없습니다.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setLocation("/")}
            >
              홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-3xl mb-3">{event.title}</CardTitle>
                <div className="flex gap-2">
                  {event.isProposal === 1 && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                      모임 제안
                    </Badge>
                  )}
                  {event.isConfirmed === 1 && (
                    <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      확정됨
                    </Badge>
                  )}
                </div>
              </div>
              {isRegistered ? (
                <Button
                  variant="outline"
                  onClick={handleUnregister}
                  disabled={unregisterFromEvent.isPending}
                >
                  참여 취소
                </Button>
              ) : (
                <Button
                  onClick={handleRegister}
                  disabled={registerForEvent.isPending}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  참여 신청
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">모임 설명</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{event.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="h-5 w-5" />
                <span>{formatDate(event.date)}</span>
              </div>
              {event.timeRange && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="h-5 w-5" />
                  <span>{event.timeRange}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-600">
                <DollarSign className="h-5 w-5" />
                <span>{event.fee > 0 ? `유료 (${event.organizer?.accountNumber || "계좌번호 미등록"})` : "무료"}</span>
              </div>
              {event.minParticipants != null && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="h-5 w-5" />
                  <span>
                    신청자: {event._count?.registrations || 0}명 / 최소 {event.minParticipants}명
                    {event.maxParticipants && ` / 최대 ${event.maxParticipants}명 (권장)`}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 주관자 정보 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">주관자 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-slate-700">
              <Users className="h-5 w-5" />
              <span className="font-medium">{event.organizer?.name || "정보 없음"}</span>
            </div>
            {event.organizer?.email && (
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="h-5 w-5" />
                <span>{event.organizer.email}</span>
              </div>
            )}
            {event.organizer?.phone && (
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="h-5 w-5" />
                <span>{event.organizer.phone}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 참여자 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">참여자 목록 ({participants?.length || 0}명)</CardTitle>
          </CardHeader>
          <CardContent>
            {participants && participants.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-medium">
                        {participant.user?.name?.charAt(0) || "?"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{participant.user?.name || "이름 없음"}</p>
                      {localUser?.role === 'admin' && (
                        <div className="mt-2 space-y-1 text-sm text-slate-600">
                          {participant.user?.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <span>{participant.user.email}</span>
                            </div>
                          )}
                          {participant.user?.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              <span>{participant.user.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>신청일시: {new Date(participant.createdAt).toLocaleString("ko-KR")}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-6">아직 참여자가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
