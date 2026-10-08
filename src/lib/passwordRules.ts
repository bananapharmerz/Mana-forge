// The password rules, shared by sign-up and password reset.
import { breachCount } from "@/lib/pwned";
import { securityEvent } from "@/lib/securityLog";

/** What's wrong with this password for this email, or null if it's fine. */
export async function passwordProblem(pass: string, email: string, area: "signup" | "reset"): Promise<string | null> {
  if (pass.length < 8) return "Password must be at least 8 characters.";
  if (pass.length > 128) return "Password must be at most 128 characters.";
  if (!/[A-Za-z]/.test(pass) || !/\d/.test(pass)) return "Use at least one letter and one number in your password.";
  const local = email.split("@")[0];
  if (local.length >= 4 && pass.toLowerCase().includes(local)) return "Your password shouldn't contain your email name.";
  // Refuse passwords that have already leaked in a data breach (they're the first ones attackers try).
  if (((await breachCount(pass)) ?? 0) > 0) {
    securityEvent("breached_password", area);
    return "That password has appeared in a known data breach, so it isn't safe to use. Please pick a different one.";
  }
  return null;
}
