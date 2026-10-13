// Shared limits for the community feed. Kept out of the "use server" actions file, because a
// "use server" module may only export async functions — constants have to live elsewhere.
export const MAX_POST = 1000;
export const MAX_COMMENT = 500;
