import { useState, useEffect } from "react";
// useAuth 제거 - localAuth 사용
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar, Clock, Plus, Edit, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";


export default function OrganizerPage() {
  const { data: user, isLoading: loading } = trpc.localAuth.me.useQuery();
  const [, setLocation] = useLocation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  // localStorage에서 저장된 폼 데이터 불러오기
  const loadFormDataFromStorage = () => {
    try {
      const saved = localStorage.getItem('eventFormData');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('저장된 데이터 불러오기 실패:', error);
    }
    return null;
  };

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    keywords: "",
    instructorName: "",
    fee: 0,
    date: "",
    timeRange: "",
    isProposal: false,
    eventStatus: "scheduled" as "proposal" | "scheduled" | "confirmed",
    minParticipants: 0,
    maxParticipants: 0,
    organizerParticipates: true, // 기본값: 개설자도 참여
  });

  const { data: myEvents } = trpc.events.listMine.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: availableSlots } = trpc.availableSlots.list.useQuery();

  const createEvent = trpc.events.create.useMutation();
  const updateEvent = trpc.events.update.useMutation();
  const deleteEvent = trpc.events.delete.useMutation();
  const utils = trpc.useUtils();

  // formData가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    if (showCreateDialog && !editingEvent) {
      localStorage.setItem('eventFormData', JSON.stringify(formData));
    }
  }, [formData, showCreateDialog, editingEvent]);

  // 팝업이 닫힐 때 localStorage 삭제
  useEffect(() => {
    if (!showCreateDialog) {
      localStorage.removeItem('eventFormData');
    }
  }, [showCreateDialog]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>로그인 필요</CardTitle>
            <CardDescription>모임을 개설하려면 로그인이 필요합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => setLocation("/")}>
              로그인하기
            </Button>
            <Button variant="outline" onClick={() => setLocation("/")}>
              홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleOpenCreateDialog = () => {
    setEditingEvent(null);

    // localStorage에서 저장된 데이터 불러오기
    const savedData = loadFormDataFromStorage();
    if (savedData) {
      setFormData(savedData);
    } else {
      setFormData({
        title: "",
        description: "",
        keywords: "",
        instructorName: "",
        fee: 0,
        date: "",
        timeRange: "",
        isProposal: false,
        eventStatus: "scheduled",
        minParticipants: 0,
        maxParticipants: 0,
        organizerParticipates: true,
      });
    }
    setShowCreateDialog(true);
  };

  const handleOpenEditDialog = (event: any) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      keywords: event.keywords || "",
      instructorName: event.instructorName || "",
      fee: event.fee,
      date: event.date || "",
      timeRange: event.timeRange || "",
      isProposal: event.isProposal,
      eventStatus: (event.eventStatus || (event.isProposal ? "proposal" : event.isConfirmed ? "confirmed" : "scheduled")) as "proposal" | "scheduled" | "confirmed",
      minParticipants: event.minParticipants || 0,
      maxParticipants: event.maxParticipants || 0,
      organizerParticipates: true, // 수정 시는 기본값 사용
    });
    setShowCreateDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }

    // 확정모임(제안이 아닌 경우)은 일정 필수
    if (formData.eventStatus !== 'proposal' && (!formData.date || !formData.timeRange)) {
      toast.error("확정모임은 날짜와 시간을 반드시 입력해야 합니다.");
      return;
    }

    // 유료 모임은 계좌번호 필수
    if (formData.fee > 0 && !user?.accountNumber) {
      toast.error("유료 모임을 개설하려면 계좌번호를 먼저 등록해주세요.");
      return;
    }

    try {
      if (editingEvent) {
        await updateEvent.mutateAsync({
          id: editingEvent.id,
          ...formData,
        });
        toast.success("모임이 수정되었습니다.");
      } else {
        await createEvent.mutateAsync({
          ...formData,
          // Sync isProposal for API compatibility if needed
          isProposal: formData.eventStatus === 'proposal'
        });
        toast.success("모임이 생성되었습니다. 관리자 승인을 기다려주세요.");
      }
      setShowCreateDialog(false);
      utils.events.listMine.invalidate();
    } catch (error) {
      toast.error("오류가 발생했습니다.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      await deleteEvent.mutateAsync({ id });
      toast.success("모임이 삭제되었습니다.");
      utils.events.listMine.invalidate();
    } catch (error) {
      toast.error("삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Main Content */}
      <main className="container py-8 space-y-8">
        {/* Available Slots Info */}
        <Card>
          <CardHeader>
            <CardTitle>사용 가능한 시간대</CardTitle>
            <CardDescription>
              {user?.alwaysAvailable
                ? "항상 가능 - 자유롭게 모임을 개설할 수 있습니다."
                : "관리자가 설정한 시간대 중에서 선택하여 모임을 개설할 수 있습니다."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user?.alwaysAvailable ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">항상 가능</span>
              </div>
            ) : availableSlots && availableSlots.length > 0 ? (
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-3">
                {availableSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="border rounded-lg p-3 text-sm space-y-1"
                  >
                    <div className="font-medium">{slot.date}</div>
                    <div className="text-muted-foreground">
                      {slot.startTime} - {slot.endTime}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                현재 사용 가능한 시간대가 없습니다.
              </p>
            )}
          </CardContent>
        </Card>

        {/* My Events */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">내 모임</h2>
            <Button onClick={handleOpenCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              모임 생성
            </Button>
          </div>

          <div className="grid gap-4">
            {myEvents && myEvents.length > 0 ? (
              myEvents.map((event) => (
                <Card key={event.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{event.title}</CardTitle>
                        <CardDescription className="mt-2">
                          {event.description}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          event.status === "approved"
                            ? "default"
                            : event.status === "rejected"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {event.status === "approved"
                          ? "승인됨"
                          : event.status === "rejected"
                            ? "거부됨"
                            : "승인 대기"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{event.date || "일시 미정"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{event.timeRange || "시간 미정"}</span>
                      </div>
                    </div>
                    {event.keywords && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">키워드: </span>
                        {event.keywords}
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="text-muted-foreground">참가비: </span>
                      {event.fee === 0 ? "무료" : `${event.fee.toLocaleString()}원`}
                    </div>
                    {event.eventStatus === 'proposal' ? (
                      <Badge variant="outline">모임 제안</Badge>
                    ) : event.eventStatus === 'confirmed' ? (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">진행 확정</Badge>
                    ) : (
                      <Badge variant="secondary">개설 확정</Badge>
                    )}
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditDialog(event)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        수정
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(event.id)}
                        disabled={deleteEvent.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        삭제
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    아직 생성한 모임이 없습니다.
                  </p>
                  <Button onClick={handleOpenCreateDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    첫 모임 만들기
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "모임 수정" : "모임 생성"}
            </DialogTitle>
            <DialogDescription>
              모임 정보를 입력하세요. 관리자 승인 후 참여자에게 공개됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">제목 *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="모임 제목을 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">내용</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="모임에 대한 상세 설명을 입력하세요"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">
                키워드
                <span className="text-xs text-muted-foreground ml-2">(쉼표로 구분)</span>
              </Label>
              <Input
                id="keywords"
                value={formData.keywords}
                onChange={(e) =>
                  setFormData({ ...formData, keywords: e.target.value })
                }
                placeholder="예: AI, 철학, 토론"
              />
              <p className="text-xs text-muted-foreground">
                여러 키워드는 쉼표(,)로 구분하여 입력해주세요.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructorName">
                모임주관자(강사) 이름
                <span className="text-xs text-muted-foreground ml-2">(선택)</span>
              </Label>
              <Input
                id="instructorName"
                value={formData.instructorName}
                onChange={(e) =>
                  setFormData({ ...formData, instructorName: e.target.value })
                }
                placeholder="강사 이름 (개설자와 다를 경우)"
              />
              <p className="text-xs text-muted-foreground">
                모임 개설자와 실제 강사가 다를 경우 입력해주세요.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPaid"
                  checked={formData.fee > 0}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, fee: checked ? 10000 : 0 })
                  }
                />
                <Label htmlFor="isPaid" className="cursor-pointer font-medium">
                  유료 모임
                </Label>
              </div>
              {formData.fee > 0 && (
                <div className="space-y-2 pl-12">
                  <Label htmlFor="fee">참가비 (원) *</Label>
                  <Input
                    id="fee"
                    type="number"
                    value={formData.fee}
                    onChange={(e) =>
                      setFormData({ ...formData, fee: parseInt(e.target.value) || 0 })
                    }
                    placeholder="10000"
                  />
                  <Label htmlFor="accountNumber" className="mt-2">
                    계좌번호 *
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    유료 모임을 개설할 경우 필요합니다
                  </p>
                  <Input
                    id="accountNumber"
                    value={user?.accountNumber || ""}
                    placeholder="계좌번호를 입력하세요"
                    disabled
                  />
                  {!user?.accountNumber && (
                    <p className="text-xs text-destructive">
                      계좌번호가 등록되지 않았습니다. 회원정보에서 등록해주세요.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label>모임 단계</Label>
              <RadioGroup
                value={formData.eventStatus}
                onValueChange={(value) => setFormData({ ...formData, eventStatus: value as any, isProposal: value === 'proposal' })}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="proposal" id="status-proposal" />
                  <Label htmlFor="status-proposal" className="font-normal cursor-pointer">
                    <span className="font-medium">제안 (Proposal)</span>
                    <span className="ml-2 text-muted-foreground text-sm">- 아이디어 단계, 일정 미정 가능</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="scheduled" id="status-scheduled" />
                  <Label htmlFor="status-scheduled" className="font-normal cursor-pointer">
                    <span className="font-medium">개설 확정 (Scheduled)</span>
                    <span className="ml-2 text-muted-foreground text-sm">- 일정 확정, 참여자 모집 중</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="confirmed" id="status-confirmed" />
                  <Label htmlFor="status-confirmed" className="font-normal cursor-pointer">
                    <span className="font-medium">진행 확정 (Confirmed)</span>
                    <span className="ml-2 text-muted-foreground text-sm">- 모집 완료 또는 진행 확정</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minParticipants">
                  최소 인원
                  <span className="text-xs text-muted-foreground ml-2">(선택)</span>
                </Label>
                <Input
                  id="minParticipants"
                  type="number"
                  min="0"
                  value={formData.minParticipants}
                  onChange={(e) => setFormData({ ...formData, minParticipants: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxParticipants">
                  최대 인원
                  <span className="text-xs text-muted-foreground ml-2">(선택)</span>
                </Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  min="0"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
            {formData.minParticipants > 0 && (
              <p className="text-xs text-muted-foreground">
                최소 인원이 달성되는 순간 모임이 자동 확정되고 모든 참여자에게 알림이 발송됩니다.
              </p>
            )}

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="organizerParticipates"
                  checked={formData.organizerParticipates}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, organizerParticipates: checked })
                  }
                />
                <Label htmlFor="organizerParticipates" className="cursor-pointer font-medium">
                  본인도 참여
                </Label>
              </div>
              <p className="text-xs text-muted-foreground pl-12">
                체크 시 개설자도 참여자로 자동 등록되며, 참여 인원에 포함됩니다.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">
                날짜 {formData.eventStatus !== 'proposal' && <span className="text-destructive">*</span>}
                {formData.eventStatus === 'proposal' && <span className="text-xs text-muted-foreground ml-2">(선택사항)</span>}
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeRange">
                시간 (예: 10:00-11:00) {formData.eventStatus !== 'proposal' && <span className="text-destructive">*</span>}
                {formData.eventStatus === 'proposal' && <span className="text-xs text-muted-foreground ml-2">(선택사항)</span>}
              </Label>
              <Input
                id="timeRange"
                value={formData.timeRange}
                onChange={(e) =>
                  setFormData({ ...formData, timeRange: e.target.value })
                }
                placeholder="10:00-11:00"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={createEvent.isPending || updateEvent.isPending}
            >
              {createEvent.isPending || updateEvent.isPending
                ? "처리 중..."
                : editingEvent
                  ? "수정하기"
                  : "생성하기"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
