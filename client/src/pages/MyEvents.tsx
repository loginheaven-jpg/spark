import { useState } from "react";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Users, Tag, DollarSign, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function MyEvents() {
  const [, setLocation] = useLocation();
  const { data: localUser } = trpc.localAuth.me.useQuery();

  // 로그인 체크
  if (!localUser) {
    setLocation("/");
    return null;
  }

  // 내가 신청한 모임 목록
  const { data: myRegistrations, isLoading: loadingRegistrations } = trpc.participants.myRegistrations.useQuery();
  
  // 내가 개설한 모임 목록
  const { data: myOrganizedEvents, isLoading: loadingOrganized } = trpc.events.myEvents.useQuery();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "일시 미정";
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      {/* Page Title */}
      <div className="bg-background/80 backdrop-blur-sm border-b">
        <div className="container py-4">
          <h1 className="text-2xl font-bold">모임현황</h1>
          <p className="text-xs text-muted-foreground">{localUser.name}님의 모임 관리</p>
        </div>
      </div>

      {/* Main Content */}
      <main className="container py-12">
        <Tabs defaultValue="registered" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="registered">신청한 모임</TabsTrigger>
            <TabsTrigger value="organized">개설한 모임</TabsTrigger>
          </TabsList>

          {/* 신청한 모임 */}
          <TabsContent value="registered" className="mt-8">
            {loadingRegistrations ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">불러오는 중...</p>
              </div>
            ) : myRegistrations && myRegistrations.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myRegistrations.filter(reg => reg.eventTitle).map((reg) => (
                  <Card
                    key={reg.id}
                    className={`hover:shadow-lg transition-all ${
                      reg.eventIsProposal === 1
                        ? "border-2 border-dashed border-orange-400"
                        : "border-2 border-solid border-blue-500"
                    }`}
                  >
                    <CardHeader>
                      <CardTitle className="line-clamp-2">{reg.eventTitle}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        모임 상세 정보
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{formatDate(reg.eventDate)}</span>
                      </div>
                      {reg.eventTimeRange && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{reg.eventTimeRange}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span>{reg.eventFee === 0 ? "무료" : `${reg.eventFee?.toLocaleString()}원`}</span>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                          신청일: {new Date(reg.createdAt).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">신청한 모임이 없습니다.</p>
                <Button onClick={() => setLocation("/")}>모임 둘러보기</Button>
              </div>
            )}
          </TabsContent>

          {/* 개설한 모임 */}
          <TabsContent value="organized" className="mt-8">
            {loadingOrganized ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">불러오는 중...</p>
              </div>
            ) : myOrganizedEvents && myOrganizedEvents.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myOrganizedEvents.map((event) => (
                  <Card
                    key={event.id}
                    className={`hover:shadow-lg transition-all ${
                      event.isProposal === 1
                        ? "border-2 border-dashed border-orange-400"
                        : "border-2 border-solid border-blue-500"
                    }`}
                  >
                    <CardHeader>
                      <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {event.description || "상세 설명이 없습니다."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      {event.timeRange && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{event.timeRange}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span>{event.fee === 0 ? "무료" : `${event.fee?.toLocaleString()}원`}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>신청자: {event._count?.registrations || 0}명</span>
                      </div>
                      {event.isProposal === 1 && event.minParticipants && (
                        <div className="text-xs text-orange-600">
                          최소 인원: {event.minParticipants}명
                        </div>
                      )}
                      <div className="pt-2 border-t flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setLocation(`/organizer?edit=${event.id}`)}
                        >
                          수정
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setLocation(`/admin/event/${event.id}/registrations`)}
                        >
                          신청자 보기
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">개설한 모임이 없습니다.</p>
                <Button onClick={() => setLocation("/organizer")}>모임 개설하기</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
