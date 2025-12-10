import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AuthModal({ open, onOpenChange, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 로그인 폼 (자동 완성)
  const [loginEmail, setLoginEmail] = useState(() => {
    return localStorage.getItem("saved-login-email") || "";
  });
  const [loginPassword, setLoginPassword] = useState(() => {
    return localStorage.getItem("saved-login-password") || "";
  });

  // 회원가입 폼
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerAccountNumber, setRegisterAccountNumber] = useState("");
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  const loginMutation = trpc.localAuth.login.useMutation({
    onSuccess: () => {
      toast.success("로그인 성공!");
      // 로그인 정보 저장 (다음 로그인 시 자동 완성용)
      localStorage.setItem("saved-login-email", loginEmail);
      localStorage.setItem("saved-login-password", loginPassword);
      onOpenChange(false);
      onSuccess?.();
      // 쿠키 저장을 위한 짧은 대기 후 페이지 새로고침
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const registerMutation = trpc.localAuth.register.useMutation({
    onSuccess: () => {
      toast.success("회원가입 성공! 자동으로 로그인합니다.");

      // 자동 로그인 시도
      loginMutation.mutate({
        email: registerEmail,
        password: registerPassword
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    loginMutation.mutate({ email: loginEmail, password: loginPassword });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerName || !registerEmail || !registerPhone || !registerPassword) {
      toast.error("필수 항목을 모두 입력해주세요.");
      return;
    }

    if (registerPassword.length < 6) {
      toast.error("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!agreedToPrivacy) {
      toast.error("개인정보 제공 동의가 필요합니다.");
      return;
    }

    registerMutation.mutate({
      name: registerName,
      email: registerEmail,
      phone: registerPhone, // 필수
      password: registerPassword,
      accountNumber: registerAccountNumber || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {mode === "login" ? "로그인" : "회원가입"}
          </DialogTitle>
          <DialogDescription>
            {mode === "login"
              ? "모임을 개설하려면 로그인이 필요합니다."
              : "모임 주관자로 등록하기 위해 회원가입을 진행해주세요."}
          </DialogDescription>
        </DialogHeader>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">이메일</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="example@email.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">비밀번호</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "로그인 중..." : "로그인"}
            </Button>

            <div className="text-center text-sm">
              <Link href="/forgot-password">
                <button
                  type="button"
                  className="text-blue-600 hover:underline text-sm"
                  onClick={() => onOpenChange(false)}
                >
                  비밀번호를 잊어버리셨나요?
                </button>
              </Link>
            </div>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">계정이 없으신가요? </span>
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto"
                onClick={() => setMode("register")}
              >
                30초 회원가입
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-name">이름 *</Label>
              <Input
                id="register-name"
                type="text"
                placeholder="홍길동"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                실명, 가명 자유. 단, 모임개설을 하실 분은 실명을 쓰시길 권합니다.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-email">이메일 *</Label>
              <Input
                id="register-email"
                type="email"
                placeholder="example@email.com"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-phone">전화번호 *</Label>
              <Input
                id="register-phone"
                type="tel"
                placeholder="010-1234-5678"
                value={registerPhone}
                onChange={(e) => setRegisterPhone(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-password">비밀번호 * (최소 6자)</Label>
              <div className="relative">
                <Input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-confirm-password">비밀번호 확인 *</Label>
              <div className="relative">
                <Input
                  id="register-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••"
                  value={registerConfirmPassword}
                  onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-account">계좌번호</Label>
              <Input
                id="register-account"
                type="text"
                placeholder="은행명 계좌번호"
                value={registerAccountNumber}
                onChange={(e) => setRegisterAccountNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                유료모임 개설자만 필요 (참가비 입금받을 계좌)
              </p>
            </div>

            <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
              <input
                type="checkbox"
                id="privacy-agreement"
                checked={agreedToPrivacy}
                onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="privacy-agreement" className="text-sm text-slate-700 cursor-pointer">
                <span className="font-medium">개인정보 제공 동의 *</span>
                <p className="text-xs text-slate-500 mt-1">
                  모임 운영을 위해 이름, 이메일, 전화번호 등의 개인정보가 수집되며, 모임 참여자 및 주관자에게 공개될 수 있습니다.
                </p>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? "가입 중..." : "회원가입"}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">이미 계정이 있으신가요? </span>
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto"
                onClick={() => setMode("login")}
              >
                로그인
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
