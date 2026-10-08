// How a deck's author is shown publicly: their chosen display name, never their email.
export const authorName = (name: string | null | undefined) => name?.trim() || "Anonymous player";

/** j•••@gmail.com: enough to recognise your own address, not enough to harvest it. */
export const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  if (!domain) return "your email";
  return `${local.slice(0, 1)}•••@${domain}`;
};
