/**
 * Role Types for MajuMail
 * Defines the role/user switching functionality for Marcel and Julien
 */

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  mailboxAddress: string;
  avatarColor: string;
}

export const TEAM_MEMBERS: Record<string, TeamMember> = {
  marcel: {
    id: "marcel",
    name: "Marcel",
    email: "kueck.marcel@gmail.com",
    mailboxAddress: "marcel@mail.rechnungs-api.de",
    avatarColor: "#3B82F6", // blue-500
  },
  julien: {
    id: "julien",
    name: "Julien",
    email: "hello@julien-scholz.dev",
    mailboxAddress: "julien@mail.rechnungs-api.de",
    avatarColor: "#8B5CF6", // violet-500
  },
} as const;

export type RoleId = keyof typeof TEAM_MEMBERS;

export interface RoleContextValue {
  /** The currently active role */
  activeRole: TeamMember;
  /** The ID of the active role */
  activeRoleId: RoleId;
  /** Switch to a different role */
  switchRole: (roleId: RoleId) => void;
  /** Get all available team members */
  teamMembers: TeamMember[];
  /** Check if a given email matches the active role */
  isActiveRole: (email: string) => boolean;
  /** Get the other team member (not the active one) */
  otherMember: TeamMember;
}

/**
 * Find a team member by their login email
 */
export function findMemberByEmail(email: string): TeamMember | undefined {
  return Object.values(TEAM_MEMBERS).find(
    (member) => member.email.toLowerCase() === email.toLowerCase()
  );
}

/**
 * Find a team member by their mailbox address
 */
export function findMemberByMailbox(mailboxAddress: string): TeamMember | undefined {
  return Object.values(TEAM_MEMBERS).find(
    (member) => member.mailboxAddress.toLowerCase() === mailboxAddress.toLowerCase()
  );
}