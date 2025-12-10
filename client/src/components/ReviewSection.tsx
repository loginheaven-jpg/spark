import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface ReviewSectionProps {
    eventId: number;
}

export function ReviewSection({ eventId }: ReviewSectionProps) {
    const [content, setContent] = useState("");
    const [rating, setRating] = useState(5);
    const [isWriting, setIsWriting] = useState(false);

    const { data: reviews, isLoading, refetch } = trpc.reviews.list.useQuery({ eventId });
    const { data: me } = trpc.localAuth.me.useQuery();
    const createReview = trpc.reviews.create.useMutation({
        onSuccess: () => {
            toast.success("후기가 등록되었습니다.");
            setContent("");
            setIsWriting(false);
            refetch();
        },
        onError: (err) => {
            toast.error(err.message);
        }
    });

    const handleSubmit = () => {
        if (!content.trim()) {
            toast.error("내용을 입력해주세요.");
            return;
        }
        createReview.mutate({ eventId, content, rating });
    };

    return (
        <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl">참여 후기 ({reviews?.length || 0})</CardTitle>
                {me && !isWriting && (
                    <Button variant="outline" onClick={() => setIsWriting(true)}>후기 작성하기</Button>
                )}
            </CardHeader>
            <CardContent>
                {isWriting && (
                    <div className="mb-6 p-4 bg-slate-50 rounded-lg space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`w-6 h-6 cursor-pointer transition-colors ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-slate-300"}`}
                                    onClick={() => setRating(star)}
                                />
                            ))}
                            <span className="ml-2 text-sm font-medium text-slate-600">{rating}점</span>
                        </div>
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="모임은 어떠셨나요? 솔직한 후기를 남겨주세요."
                            className="bg-white resize-none"
                            rows={3}
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsWriting(false)}>취소</Button>
                            <Button onClick={handleSubmit} disabled={createReview.isPending}>
                                {createReview.isPending ? "등록 중..." : "등록하기"}
                            </Button>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {reviews?.map((review) => (
                        <div key={review.id} className="border-b last:border-0 pb-6 last:pb-0">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-500 text-xs">
                                        {review.userName?.charAt(0) || "?"}
                                    </div>
                                    <div>
                                        <span className="font-semibold text-sm block">{review.userName || "익명"}</span>
                                        <span className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="flex gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`w-3 h-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-slate-300"}`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap pl-10">{review.content}</p>
                        </div>
                    ))}
                    {!isLoading && reviews?.length === 0 && (
                        <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                            <p className="text-slate-500 text-sm">아직 작성된 후기가 없습니다.</p>
                            <p className="text-slate-400 text-xs mt-1">첫 번째 후기를 남겨주세요!</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
