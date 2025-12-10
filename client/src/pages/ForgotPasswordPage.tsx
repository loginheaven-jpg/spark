import { useState } from "react";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Mail, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);


  const forgotPasswordMutation = trpc.localAuth.forgotPassword.useMutation({
    onSuccess: (data) => {
      setIsSubmitted(true);
      // Success handled by isSubmitted state
    },
    onError: (error) => {
      alert(`오류: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      alert("이메일 주소를 입력해주세요.");
      return;
    }

    forgotPasswordMutation.mutate({ email });
  };

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
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">비밀번호 찾기</CardTitle>
            <CardDescription>
              가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일 주소</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={forgotPasswordMutation.isPending}
                >
                  {forgotPasswordMutation.isPending ? "발송 중..." : "재설정 링크 받기"}
                </Button>

                <div className="text-center text-sm text-slate-600">
                  비밀번호가 기억나셨나요?{" "}
                  <Link href="/" className="text-blue-600 hover:underline">
                    로그인하기
                  </Link>
                </div>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">이메일을 확인해주세요!</p>
                  <p className="text-sm text-green-700 mt-2">
                    {email}로 비밀번호 재설정 링크를 발송했습니다.
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    링크는 1시간 동안 유효합니다.
                  </p>
                </div>

                <div className="text-sm text-slate-600">
                  이메일이 오지 않았나요?{" "}
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="text-blue-600 hover:underline"
                  >
                    다시 시도하기
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
