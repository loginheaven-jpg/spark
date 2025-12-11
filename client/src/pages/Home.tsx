import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Clock, Users, Tag, DollarSign, ChevronDown, CheckCircle2, UserCheck, UserPlus, Pencil, Trash2, Search, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import EventCalendar from "@/components/EventCalendar";
import { AuthModal } from "@/components/AuthModal";
import { PendingReviewModal } from "@/components/PendingReviewModal";

export default function Home() {
  const [, setLocation] = useLocation();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showReviewModal, setShowReviewModal] = useState(false);

  // 로컬 로그인 상태 확인 - Trigger Deployment #2
  const { data: localUser } = trpc.localAuth.me.useQuery();
  const logoutMutation = trpc.localAuth.logout.useMutation();

  // Check for pending reviews
  const { data: pendingReviewEvent } = trpc.reviews.pending.useQuery(undefined, {
    enabled: !!localUser,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (pendingReviewEvent) {
      setShowReviewModal(true);
    }
  }, [pendingReviewEvent]);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast.success("로그아웃되었습니다.");
      window.location.reload();
    } catch (error) {
      toast.error("로그아웃 중 오류가 발생했습니다.");
    }
  };

  // Fetch approved events
  const { data: allEvents, isLoading } = trpc.events.listApproved.useQuery();

  // Filter events by selected date and search query
  const events = allEvents?.filter(event => {
    // 날짜 필터
    if (selectedDate && event.date !== selectedDate) {
      return false;
    }

    // 검색어 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTitle = event.title?.toLowerCase().includes(query);
      const matchDescription = event.description?.toLowerCase().includes(query);
      const matchKeywords = event.keywords?.toLowerCase().includes(query);
      const matchInstructor = event.instructorName?.toLowerCase().includes(query);

      return matchTitle || matchDescription || matchKeywords || matchInstructor;
    }

    return true;
  });

  const registerForEvent = trpc.participants.register.useMutation();
  const unregisterFromEvent = trpc.participants.unregister.useMutation();
  const deleteEvent = trpc.events.delete.useMutation();
  const utils = trpc.useUtils();
  const { data: myRegistrations } = trpc.participants.myRegistrations.useQuery(
    undefined,
    { enabled: !!localUser }
  );

  const isRegistered = (eventId: number) => {
    return myRegistrations?.some(reg => reg.eventId === eventId) || false;
  };

  const handleCardClick = (eventId: number, e: React.MouseEvent) => {
    // 버튼 클릭은 무시
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }

    // 상세 페이지로 이동
    setLocation(`/event/${eventId}`);
  };

  const handleDelete = async (eventId: number) => {
    if (confirm("정말 이 모임을 삭제하시겠습니까?")) {
      try {
        await deleteEvent.mutateAsync({ id: eventId });
        toast.success("모임이 삭제되었습니다.");
        utils.events.listApproved.invalidate();
      } catch (error: any) {
        toast.error(error.message || "삭제 중 오류가 발생했습니다.");
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

  const canEditEvent = (event: any) => {
    if (!localUser) return false;
    return localUser.role === "admin" || event.organizerId === localUser.id;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-3">
            함께 배우고 성장하는 시간
          </h2>
          <p className="text-lg text-slate-600">
            다양한 주제의 토론회와 강연회에 참여하세요
          </p>
          <p className="text-sm text-slate-500 mt-2">
            관심 있는 모임을 선택하고 간편하게 신청할 수 있습니다
          </p>

          {/* 검색창 */}
          <div className="max-w-2xl mx-auto mt-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="강사 이름, 제목, 설명, 키워드로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* 범례 (Legend) */}
          <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-dashed border-slate-300 bg-white"></div>
              <span>모임 제안 (수요조사)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-blue-500 bg-white"></div>
              <span>개설 확정 (모집중)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-4 border-green-500 bg-green-50"></div>
              <span>진행 확정 (참석가능)</span>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-slate-900 mb-6">
            모임 목록
          </h3>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-slate-600">모임 목록을 불러오는 중...</p>
            </div>
          ) : events && events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => {
                const registered = isRegistered(event.id);
                // 테두리 스타일 설정 (제안: 점선+회색, 개설확정: 실선+파란색, 진행확정: 굵은실선+초록색)
                let cardBorderClass = "border-2 opacity-90";
                const eventStatus = event.eventStatus || (event.isProposal ? "proposal" : event.isConfirmed ? "confirmed" : "scheduled");

                if (eventStatus === 'proposal') {
                  cardBorderClass += " border-dashed border-slate-300 shadow-sm";
                } else if (eventStatus === 'confirmed') {
                  // 진행 확정 (Proceeding) - Emerald
                  cardBorderClass += " border-4 border-emerald-500 shadow-xl shadow-emerald-100 bg-emerald-50/30";
                } else {
                  // 개설 확정 (Scheduled/Recruiting) - Violet
                  cardBorderClass += " border-blue-500 shadow-lg shadow-blue-100";
                }

                return (
                  <Card
                    key={event.id}
                    className={`${cardBorderClass} hover:opacity-100 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden`}
                    onClick={(e) => handleCardClick(event.id, e)}
                  >
                    {/* 참여 상태 아이콘 */}
                    <div className="absolute top-4 right-4 z-10">
                      {registered ? (
                        <div className="bg-green-500 text-white rounded-full p-2 shadow-lg">
                          <UserCheck className="h-6 w-6" />
                        </div>
                      ) : (
                        <div className="bg-blue-500 text-white rounded-full p-2 shadow-lg hover:bg-blue-600 transition-colors">
                          <UserPlus className="h-6 w-6" />
                        </div>
                      )}
                    </div>

                    {/* 링크 복사 버튼 */}
                    <div className="absolute top-4 right-16 z-10">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="rounded-full shadow-md bg-white/80 hover:bg-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          const link = `${window.location.origin}/event/${event.id}`;
                          navigator.clipboard.writeText(link).then(() => {
                            toast.success("링크가 복사되었습니다!");
                          });
                        }}
                      >
                        <LinkIcon className="h-4 w-4 text-slate-600" />
                      </Button>
                    </div>

                    <CardHeader>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <CardTitle className="text-xl pr-12">{event.title}</CardTitle>
                      </div>
                      {event.instructorName && (
                        <div className="text-sm text-slate-600 mb-2">
                          <span className="font-medium">강사:</span> {event.instructorName}
                        </div>
                      )}
                      <CardDescription className="line-clamp-2">
                        {event.description}
                      </CardDescription>
                      <div className="flex gap-2 mt-2">
                        {eventStatus === 'proposal' && (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200">
                            모임 제안
                          </Badge>
                        )}
                        {eventStatus === 'confirmed' && (
                          <Badge className="bg-green-600 text-white flex items-center gap-1 hover:bg-green-700">
                            <CheckCircle2 className="h-3 w-3" />
                            진행 확정
                          </Badge>
                        )}
                        {eventStatus === 'scheduled' && (
                          <Badge className="bg-blue-600 text-white hover:bg-blue-700">
                            개설 확정
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      {event.timeRange && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="h-4 w-4" />
                          <span>{event.timeRange}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <div className="h-4 w-4 flex items-center justify-center font-bold text-xs bg-slate-100 rounded-full border border-slate-300">₩</div>
                        <span>{event.fee === 0 ? "무료" : `${event.fee.toLocaleString()}원`}</span>
                      </div>

                      {/* 참여자 수 및 진행률 바 (최소 인원 기준) */}
                      {event.minParticipants != null && event.minParticipants > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                              <Users className="h-4 w-4" />
                              <span>신청자/최소인원</span>
                            </div>
                            <span className="font-medium text-slate-900">
                              {event._count?.registrations || 0} / {event.minParticipants}명
                            </span>
                          </div>
                          <Progress
                            value={Math.min(((event._count?.registrations || 0) / event.minParticipants) * 100, 100)}
                            className="h-2"
                          />
                          {(event._count?.registrations || 0) >= event.minParticipants && (
                            <p className="text-xs text-green-600 font-medium">
                              ✓ 최소 인원 도달!
                            </p>
                          )}
                        </div>
                      )}

                      {event.maxParticipants != null && (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span className="text-xs">
                            권장 인원: {event.maxParticipants}명
                          </span>
                        </div>
                      )}

                      {/* 수정/삭제 버튼 (개설자 + 어드민만 표시) */}
                      {canEditEvent(event) && (
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/organizer?edit=${event.id}`);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            수정
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(event.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            삭제
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-slate-600">
                  {selectedDate
                    ? "선택한 날짜에 예정된 모임이 없습니다."
                    : "아직 등록된 모임이 없습니다."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Calendar */}
        {/* Calendar - 일시적으로 숨김 (모임이 적으므로) */}
        {/* <Collapsible defaultOpen={false} className="mb-8">
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full flex items-center justify-between p-6 h-auto"
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span className="text-lg font-semibold">달력에서 모임 찾기</span>
              </div>
              <ChevronDown className="h-5 w-5" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <Card>
              <CardContent className="p-6">
                <EventCalendar
                  events={allEvents || []}
                  onDateClick={setSelectedDate}
                />
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible> */}
      </main>

      {/* Auth Modal */}
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onSuccess={() => {
          setAuthModalOpen(false);
          utils.localAuth.me.invalidate();
        }}
      />

      {pendingReviewEvent && (
        <PendingReviewModal
          event={pendingReviewEvent}
          open={showReviewModal}
          onOpenChange={setShowReviewModal}
          onSuccess={() => utils.reviews.pending.invalidate()}
        />
      )}
    </div>
  );
}
