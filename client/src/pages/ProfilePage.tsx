import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { data: localUser, isLoading } = trpc.localAuth.me.useQuery();
  const updateProfileMutation = trpc.localAuth.updateProfile.useMutation();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  useEffect(() => {
    if (localUser) {
      setName(localUser.name || "");
      setPhone(localUser.phone || "");
      setAccountNumber(localUser.accountNumber || "");
    }
  }, [localUser]);

  // 로그인하지 않은 경우 홈으로 리다이렉트
  useEffect(() => {
    if (!isLoading && !localUser) {
      toast.error("로그인이 필요합니다.");
      setLocation("/");
    }
  }, [localUser, isLoading, setLocation]);

  // 필수정보 입력 안내 표시
  const hasRequiredInfo = localUser && localUser.name && localUser.phone;
  const isFromRedirect = !hasRequiredInfo;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("이름을 입력해주세요.");
      return;
    }

    if (!phone.trim()) {
      toast.error("전화번호를 입력해주세요.");
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        name: name.trim(),
        phone: phone.trim(),
        accountNumber: accountNumber.trim() || undefined,
      });
      toast.success("정보가 수정되었습니다.");
      setLocation("/");
    } catch (error: any) {
      toast.error(error.message || "정보 수정 중 오류가 발생했습니다.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!localUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">정보 수정</CardTitle>
            {isFromRedirect && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  필수 정보를 입력해주세요. 모임 참여 및 개설을 위해 이름과 전화번호가 필요합니다.
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">이메일 (변경 불가)</Label>
                <Input
                  id="email"
                  type="email"
                  value={localUser.email}
                  disabled
                  className="bg-slate-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름을 입력하세요"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">전화번호 *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-1234-5678"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">계좌번호 (유료 모임을 개설할 경우 필요합니다)</Label>
                <Input
                  id="accountNumber"
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="은행명 계좌번호 (예: 국민은행 123-456-789)"
                />
                <p className="hidden text-sm text-slate-500">
                  유료 모임을 개설할 경우 필요합니다
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? "저장 중..." : "저장"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/")}
                >
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
