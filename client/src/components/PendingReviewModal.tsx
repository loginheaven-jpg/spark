import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface PendingReviewModalProps {
    event: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function PendingReviewModal({ event, open, onOpenChange, onSuccess }: PendingReviewModalProps) {
    const [content, setContent] = useState("");
    const [rating, setRating] = useState(5);

    const createReview = trpc.reviews.create.useMutation({
        onSuccess: () => {
            toast.success("소중한 후기 감사합니다!");
            onSuccess();
            onOpenChange(false);
        },
        onError: (err) => {
            // If conflict (already reviewed), just close
            if (err.data?.code === 'CONFLICT') {
                onOpenChange(false);
            } else {
                toast.error(err.message);
            }
        }
    });

    const handleSubmit = () => {
        if (!content.trim()) {
            toast.error("내용을 입력해주세요.");
            return;
        }
        createReview.mutate({ eventId: event.id, content, rating });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => preventClose && e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>지난 모임은 어떠셨나요?</DialogTitle>
                    <DialogDescription>
                        <span className="font-semibold text-slate-900 block mt-1 text-base">{event.title}</span>
                        <span className="block mt-1">
                            참여하신 모임에 대한 후기를 남겨주세요. 다음 참여자들에게 큰 도움이 됩니다.
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={`w-8 h-8 cursor-pointer transition-colors ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-slate-200"}`}
                                onClick={() => setRating(star)}
                            />
                        ))}
                    </div>
                    <div className="text-center font-medium text-slate-600 mb-2">
                        {rating}점 - {rating === 5 ? "최고였어요! 😍" : rating >= 4 ? "좋았어요 😊" : rating >= 3 ? "보통이에요 🙂" : "아쉬웠어요 😢"}
                    </div>

                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="어떤 점이 좋았나요? 솔직한 이야기를 들려주세요."
                        className="bg-slate-50 min-h-[120px] resize-none"
                    />
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>나중에 하기</Button>
                    <Button onClick={handleSubmit} disabled={createReview.isPending}>
                        {createReview.isPending ? "등록 중..." : "후기 등록하기"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const preventClose = true;
