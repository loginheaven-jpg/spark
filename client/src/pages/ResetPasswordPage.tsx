import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ArrowLeft, CheckCircle } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // URL에서 토큰 추출
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, []);

  const resetPasswordMutation = trpc.localAuth.resetPassword.useMutation({
    onSuccess: (data) => {
      setIsSuccess(true);
      // 3초 후 홈으로 이동
      setTimeout(() => {
        navigate("/");
      }, 3000);
    },
    onError: (error) => {
      alert(`오류: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      alert("유효하지 않은 링크입니다.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (newPassword.length < 6) {
      alert("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    resetPasswordMutation.mutate({ token, newPassword });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <Header />
        
        <div className="container max-w-md mx-auto px-4 py-20">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-red-600">유효하지 않은 링크</CardTitle>
              <CardDescription>
                비밀번호 재설정 링크가 유효하지 않거나 만료되었습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link href="/forgot-password">
                <Button>비밀번호 찾기로 이동</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Header />
      
      <div className="container max-w-md mx-auto px-4 py-20">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            홈으로 돌아가기
          </Button>
        </Link>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              {isSuccess ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <Lock className="h-6 w-6 text-blue-600" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {isSuccess ? "비밀번호 변경 완료" : "새 비밀번호 설정"}
            </CardTitle>
            <CardDescription>
              {isSuccess
                ? "비밀번호가 성공적으로 변경되었습니다."
                : "새로운 비밀번호를 입력해주세요."}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {!isSuccess ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">새 비밀번호</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="최소 6자 이상"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="비밀번호를 다시 입력하세요"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? "변경 중..." : "비밀번호 변경"}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">변경이 완료되었습니다!</p>
                  <p className="text-sm text-green-700 mt-2">
                    새로운 비밀번호로 로그인할 수 있습니다.
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    3초 후 자동으로 홈으로 이동합니다...
                  </p>
                </div>

                <Link href="/">
                  <Button className="w-full">지금 로그인하기</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
