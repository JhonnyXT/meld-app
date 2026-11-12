export function isTaskScheduledOn(repeatRule: string, anchorDate: Date, date: Date): boolean {
  if (date.getTime() < anchorDate.getTime()) return false;
  switch (repeatRule) {
    case 'Daily':
      return true;
    case 'Weekly':
      return date.getDay() === anchorDate.getDay();
    case 'Monthly':
      return date.getDate() === anchorDate.getDate();
    default:
      return false;
  }
}
