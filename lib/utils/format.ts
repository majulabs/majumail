import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  isThisWeek,
  isThisYear,
} from "date-fns";

export function formatEmailDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;

  if (isToday(d)) {
    return format(d, "HH:mm");
  }

  if (isYesterday(d)) {
    return "Yesterday";
  }

  if (isThisWeek(d)) {
    return format(d, "EEEE");
  }

  if (isThisYear(d)) {
    return format(d, "MMM d");
  }

  return format(d, "MMM d, yyyy");
}

export function formatFullDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "EEEE, MMMM d, yyyy 'at' HH:mm");
}

export function formatRelativeDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length).trim() + "...";
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function extractNameFromEmail(email: string): string {
  // Handle "Name <email@domain.com>" format
  const match = email.match(/^([^<]+)\s*</);
  if (match) {
    return match[1].trim();
  }
  // Return part before @ if no name
  return email.split("@")[0];
}

export function extractEmailAddress(email: string): string {
  const match = email.match(/<(.+)>/);
  return match ? match[1].toLowerCase() : email.toLowerCase().trim();
}

export function getParticipantNames(thread: { participantAddresses?: string[] | null }): string {
  if (!thread.participantAddresses || thread.participantAddresses.length === 0) return "Unknown";
  return thread.participantAddresses
    .map(extractNameFromEmail)
    .join(", ");
}
