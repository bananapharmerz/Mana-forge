// Wraps every page, and re-mounts on each navigation, so a new page fades up gently instead of
// popping in. Pure CSS (see .page-enter in globals.css); switched off for reduced motion.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
