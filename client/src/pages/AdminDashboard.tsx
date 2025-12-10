import { useState } from "react";
// useAuth 제거 - localAuth 사용
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle, XCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function AdminDashboard() {
  const { data: user, isLoading: loading } = trpc.localAuth.me.useQuery();
  const [, setLocation] = useLocation();
  const [showSlotDialog, setShowSlotDialog] = useState(false);
  const [showRegistrationsDialog, setShowRegistrationsDialog] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [newSlot, setNewSlot] = useState({
    date: "",
    startTime: "",
    endTime: "",
  });

  const { data: slots } = trpc.availableSlots.list.useQuery();
  const { data: events } = trpc.events.listAll.useQuery();
  const { data: registrations } = trpc.events.getRegistrations.useQuery(
    { eventId: selectedEventId! },
    { enabled: !!selectedEventId }
  );

  const createSlot = trpc.availableSlots.create.useMutation();
  const deleteSlot = trpc.availableSlots.delete.useMutation();
  const updateEventStatus = trpc.events.updateStatus.useMutation();
  const updateProfile = trpc.localAuth.updateProfile.useMutation();
  const utils = trpc.useUtils();
  
  const [alwaysAvailable, setAlwaysAvailable] = useState(user?.alwaysAvailable ?? true);
  
  const handleAlwaysAvailableToggle = async (checked: boolean) => {
    setAlwaysAvailable(checked);
    try {
      await updateProfile.mutateAsync({ alwaysAvailable: checked });
      await utils.localAuth.me.invalidate();
      toast.success(checked ? '"항상 가능" 모드가 활성화되었습니다.' : '"항상 가능" 모드가 비활성화되었습니다.');
    } catch (error) {
      setAlwaysAvailable(!checked);
      toast.error('설정 변경에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>접근 권한 없음</CardTitle>
            <CardDescription>관리자만 접근할 수 있는 페이지입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")}>홈으로 돌아가기</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateSlot = async () => {
    if (!newSlot.date || !newSlot.startTime || !newSlot.endTime) {
      toast.error("모든 필드를 입력해주세요.");
      return;
    }

    try {
      await createSlot.mutateAsync(newSlot);
      toast.success("시간대가 추가되었습니다.");
      setShowSlotDialog(false);
      setNewSlot({ date: "", startTime: "", endTime: "" });
      utils.availableSlots.list.invalidate();
    } catch (error) {
      toast.error("시간대 추가 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteSlot = async (id: number) => {
    try {
      await deleteSlot.mutateAsync({ id });
      toast.success("시간대가 삭제되었습니다.");
      utils.availableSlots.list.invalidate();
    } catch (error) {
      toast.error("시간대 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleUpdateEventStatus = async (id: number, status: "approved" | "rejected") => {
    try {
      await updateEventStatus.mutateAsync({ id, status });
      toast.success(status === "approved" ? "모임이 승인되었습니다." : "모임이 거부되었습니다.");
      utils.events.listAll.invalidate();
    } catch (error) {
      toast.error("상태 변경 중 오류가 발생했습니다.");
    }
  };

  const handleViewRegistrations = (eventId: number) => {
    setSelectedEventId(eventId);
    setShowRegistrationsDialog(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">관리자 대시보드</h1>
          <Button variant="outline" onClick={() => setLocation("/")}>
            참여자 화면으로
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <Tabs defaultValue="events" className="space-y-6">
          <TabsList>
            <TabsTrigger value="events">모임 관리</TabsTrigger>
            <TabsTrigger value="slots">시간대 설정</TabsTrigger>
          </TabsList>

          {/* Events Management */}
          <TabsContent value="events" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">모임 승인 관리</h2>
            </div>

            <div className="grid gap-4">
              {events && events.length > 0 ? (
                events.map((event) => (
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
                            : "대기 중"}
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
                      {event.isProposal && (
                        <Badge variant="outline">모임 제안</Badge>
                      )}
                      <div className="flex gap-2 mt-4">
                        {event.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateEventStatus(event.id, "approved")}
                              disabled={updateEventStatus.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              승인
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleUpdateEventStatus(event.id, "rejected")}
                              disabled={updateEventStatus.isPending}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              거부
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewRegistrations(event.id)}
                        >
                          <Users className="w-4 h-4 mr-1" />
                          신청자 보기
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">등록된 모임이 없습니다.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Time Slots Management */}
          <TabsContent value="slots" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">사용 가능한 시간대</h2>
              <Button onClick={() => setShowSlotDialog(true)}>시간대 추가</Button>
            </div>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="alwaysAvailable" 
                    checked={alwaysAvailable}
                    onCheckedChange={handleAlwaysAvailableToggle}
                  />
                  <Label 
                    htmlFor="alwaysAvailable" 
                    className="text-base font-medium cursor-pointer"
                  >
                    항상 가능 (모임 개설자가 자유롭게 모임을 개설할 수 있습니다)
                  </Label>
                </div>
                {!alwaysAvailable && (
                  <p className="text-sm text-muted-foreground mt-2">
                    체크를 해제하면 아래 설정한 시간대만 모임 개설이 가능합니다.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {slots && slots.length > 0 ? (
                slots.map((slot) => (
                  <Card key={slot.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{slot.date}</CardTitle>
                      <CardDescription>
                        {slot.startTime} - {slot.endTime}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteSlot(slot.id)}
                        disabled={deleteSlot.isPending}
                      >
                        삭제
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="col-span-full">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      설정된 시간대가 없습니다.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Slot Dialog */}
      <Dialog open={showSlotDialog} onOpenChange={setShowSlotDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>시간대 추가</DialogTitle>
            <DialogDescription>
              모임 개설이 가능한 날짜와 시간을 설정하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">날짜</Label>
              <Input
                id="date"
                type="date"
                value={newSlot.date}
                onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">시작 시간</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={newSlot.startTime}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, startTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">종료 시간</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={newSlot.endTime}
                  onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleCreateSlot}
              disabled={createSlot.isPending}
            >
              {createSlot.isPending ? "추가 중..." : "시간대 추가"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Registrations Dialog */}
      <Dialog open={showRegistrationsDialog} onOpenChange={setShowRegistrationsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>신청자 리스트</DialogTitle>
            <DialogDescription>
              이 모임에 신청한 참여자 목록입니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {registrations && registrations.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">이름</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">이메일</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">전화번호</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((reg) => (
                      <tr key={reg.id} className="border-t">
                        <td className="px-4 py-2 text-sm">{reg.participantName}</td>
                        <td className="px-4 py-2 text-sm">{reg.participantEmail}</td>
                        <td className="px-4 py-2 text-sm">{reg.participantPhone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                아직 신청자가 없습니다.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
