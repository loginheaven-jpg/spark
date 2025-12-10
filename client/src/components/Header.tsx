import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useState } from "react";
import { AuthModal } from "./AuthModal";

export default function Header() {
  const [, setLocation] = useLocation();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { data: localUser } = trpc.localAuth.me.useQuery();
  const logoutMutation = trpc.localAuth.logout.useMutation();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast.success("로그아웃되었습니다.");
      window.location.reload();
    } catch (error) {
      toast.error("로그아웃 중 오류가 발생했습니다.");
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setLocation("/")}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                SPARK
              </h1>
              <p className="text-xs text-slate-600">
                <span className="text-blue-600 font-bold">S</span>haring{" "}
                <span className="text-blue-600 font-bold">P</span>erspectives{" "}
                <span className="text-blue-600 font-bold">a</span>nd{" "}
                <span className="text-blue-600 font-bold">R</span>emarkable{" "}
                <span className="text-blue-600 font-bold">K</span>nowledge
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {localUser ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/my-events")}
                >
                  모임현황
                </Button>
                <Button
                  size="sm"
                  onClick={() => setLocation("/organizer")}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  모임 개설
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-medium flex items-center gap-1 hover:bg-slate-100"
                    >
                      {localUser.name}님
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {localUser.role === 'admin' && (
                      <DropdownMenuItem onClick={() => setLocation("/admin")}>
                        관리자 대시보드
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setLocation("/profile")}>
                      정보수정
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      로그아웃
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={() => setAuthModalOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  모임 개설
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAuthModalOpen(true)}
                >
                  로그인
                </Button>
                <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
