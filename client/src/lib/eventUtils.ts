/**
 * 모임 종료 여부 판단
 * - 날짜가 어제 이전이면 종료
 * - 오늘인 경우 timeRange의 종료 시간 이후면 종료
 */
export function isEventCompleted(date: string | null, timeRange: string | null): boolean {
  if (!date) return false;

  const eventDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);

  // 어제 이전이면 종료
  if (eventDate < today) return true;

  // 오늘인 경우: timeRange 끝 시간 비교
  if (eventDate.getTime() === today.getTime() && timeRange) {
    // "14:00-16:00" 형식에서 종료 시간 추출
    const match = timeRange.match(/-(\d{2}):(\d{2})/);
    if (match) {
      const endHour = parseInt(match[1], 10);
      const endMinute = parseInt(match[2], 10);
      const now = new Date();

      if (now.getHours() > endHour ||
          (now.getHours() === endHour && now.getMinutes() >= endMinute)) {
        return true;
      }
    }
  }

  return false;
}
