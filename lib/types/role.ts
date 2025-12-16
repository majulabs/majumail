/**
 * Role Types for MajuMail
 * Defines the role/filter functionality for Marcel, Julien, Support, and Info mailboxes
 */

export interface Role {
  id: string;
  name: string;
  mailboxAddress: string;
  avatarColor: string;
  icon?: string;
}

export const ROLES: Record<string, Role> = {
  marcel: {
    id: "marcel",
    name: "Marcel",
    mailboxAddress: "marcel@mail.rechnungs-api.de",
    avatarColor: "#3B82F6", // blue-500
  },
  julien: {
    id: "julien",
    name: "Julien",
    mailboxAddress: "julien@mail.rechnungs-api.de",
    avatarColor: "#8B5CF6", // violet-500
  },
  support: {
    id: "support",
    name: "Support",
    mailboxAddress: "support@mail.rechnungs-api.de",
    avatarColor: "#06B6D4", // cyan-500
  },
  info: {
    id: "info",
    name: "Info",
    mailboxAddress: "info@mail.rechnungs-api.de",
    avatarColor: "#10B981", // emerald-500
  },
} as const;

export type RoleId = keyof typeof ROLES;

export interface RoleContextValue {
  /** The currently active role filter */
  activeRole: Role;
  /** The ID of the active role */
  activeRoleId: RoleId;
  /** Switch to a different role */
  switchRole: (roleId: RoleId) => void;
  /** Get all available roles */
  allRoles: Role[];
  /** Check if a given email matches the active role's mailbox */
  isActiveRole: (email: string) => boolean;
  /** Get the mailbox address for filtering */
  activeMailboxAddress: string;
}

/**
 * Find a role by their mailbox address
 */
export function findRoleByMailbox(mailboxAddress: string): Role | undefined {
  return Object.values(ROLES).find(
    (role) => role.mailboxAddress.toLowerCase() === mailboxAddress.toLowerCase()
  );
}

/**
 * Check if an email address belongs to any of our mailboxes
 */
export function isOurMailbox(email: string): boolean {
  return Object.values(ROLES).some(
    (role) => role.mailboxAddress.toLowerCase() === email.toLowerCase()
  );
}

/**
 * Get all mailbox addresses
 */
export function getAllMailboxAddresses(): string[] {
  return Object.values(ROLES).map((role) => role.mailboxAddress);
}