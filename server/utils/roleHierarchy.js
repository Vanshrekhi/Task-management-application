/** Org hierarchy: Principal > HOD > Faculty > Student (higher rank = more authority). */

export const normalizeRole = (r) => (r ? String(r).trim() : "");

export const normalizeDept = (d) => (d ? String(d).trim() : "");

export const ROLE_RANK = {
  Principal: 4,
  HOD: 3,
  Faculty: 2,
  Student: 1,
};

export function getRoleRank(user) {
  if (!user) return 0;
  if (user.isAdmin || normalizeRole(user.role) === "Principal") {
    return ROLE_RANK.Principal;
  }
  const r = normalizeRole(user.role);
  return ROLE_RANK[r] ?? 0;
}

export function canAssignToTargetRank(creatorRank, targetRole) {
  const tr = normalizeRole(targetRole);
  const targetRank = ROLE_RANK[tr] ?? 0;
  if (!targetRank) return false;
  return creatorRank > targetRank;
}

export function assertAssignableTeam(creator, assigneeUsers) {
  const cr = getRoleRank(creator);
  if (!cr) {
    return { ok: false, message: "Your role cannot assign tasks." };
  }
  for (const u of assigneeUsers) {
    if (!canAssignToTargetRank(cr, u.role)) {
      return {
        ok: false,
        message: `You cannot assign tasks to ${u.name || "a user"} (${u.role}). Assign only to roles below you: Principal → HOD/Faculty/Student, HOD → Faculty/Student, Faculty → Student.`,
      };
    }
  }
  return { ok: true };
}

export function rolesAssignableBy(creator) {
  const cr = getRoleRank(creator);
  if (!cr) return [];
  return Object.entries(ROLE_RANK)
    .filter(([, rank]) => rank < cr)
    .map(([name]) => name);
}

export function canManageTasksRole(user) {
  if (!user) return false;
  const r = normalizeRole(user.role);
  if (user.isAdmin || r === "Principal") return true;
  return r === "HOD" || r === "Faculty";
}
