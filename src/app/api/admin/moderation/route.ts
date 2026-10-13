import { NextResponse } from "next/server";
import { adminAllowed as allowed } from "@/lib/adminKey";
import { db } from "@/lib/db";
import { hit, ipFrom } from "@/lib/rateLimit";

// For Nexus: moderate the community feed. Needs the `x-admin-key` header to match ADMIN_API_KEY
// (at least 32 characters); otherwise it's a 404.
//
//   GET                                   → open reports with the content they point at, plus feed counts
//   POST {action:"hidePost", postId}      → post hidden from the feed (reversible)
//   POST {action:"removePost", postId}    → post removed (reversible, but gone from the feed)
//   POST {action:"restorePost", postId}   → post back to visible
//   POST {action:"hideComment", commentId}
//   POST {action:"removeComment", commentId}
//   POST {action:"restoreComment", commentId}
//   POST {action:"dismissReport", reportId}  → report closed, no action taken
// Hiding or removing content also closes (actions) any open reports that point at it.
export const dynamic = "force-dynamic";

const notFound = () => new NextResponse("Not found", { status: 404 });
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const postPreview = { id: true, kind: true, body: true, deckId: true, status: true, score: true, commentCount: true, createdAt: true, author: { select: { id: true, name: true } }, deck: { select: { name: true, commanderName: true } } } as const;
const commentPreview = { id: true, postId: true, body: true, status: true, createdAt: true, author: { select: { id: true, name: true } } } as const;

export async function GET(req: Request) {
  if (!hit(`admin:${ipFrom(req.headers)}`, 60, 60 * 1000) || !allowed(req)) return notFound();

  const reports = await db.postReport.findMany({ where: { status: "open" }, orderBy: { createdAt: "desc" }, take: 100 });
  const postIds = [...new Set(reports.map((r) => r.postId).filter((x): x is string => !!x))];
  const commentIds = [...new Set(reports.map((r) => r.commentId).filter((x): x is string => !!x))];

  const [posts, comments, counts, open, hidden, removed] = await Promise.all([
    db.post.findMany({ where: { id: { in: postIds } }, select: postPreview }),
    db.postComment.findMany({ where: { id: { in: commentIds } }, select: commentPreview }),
    db.postReport.groupBy({ by: ["status"], _count: { _all: true } }).catch(() => [] as { status: string; _count: { _all: number } }[]),
    db.post.count({ where: { status: "visible" } }),
    db.post.count({ where: { status: "hidden" } }),
    db.post.count({ where: { status: "removed" } }),
  ]);

  const postMap = new Map(posts.map((p) => [p.id, p]));
  const commentMap = new Map(comments.map((c) => [c.id, c]));

  return NextResponse.json({
    reports: reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      details: r.details,
      reporterId: r.reporterId,
      at: r.createdAt,
      target: r.postId
        ? { type: "post" as const, id: r.postId, content: postMap.get(r.postId) ?? null }
        : r.commentId
          ? { type: "comment" as const, id: r.commentId, content: commentMap.get(r.commentId) ?? null }
          : { type: "unknown" as const, id: null, content: null },
    })),
    reportCounts: Object.fromEntries((counts as { status: string; _count: { _all: number } }[]).map((c) => [c.status, c._count._all])),
    posts: { visible: open, hidden, removed },
  });
}

// Close any open reports that point at a piece of content once it's been dealt with.
async function closeReportsFor(kind: "post" | "comment", id: string) {
  await db.postReport.updateMany({ where: kind === "post" ? { postId: id, status: "open" } : { commentId: id, status: "open" }, data: { status: "actioned" } });
}

// Keep the parent post's cached commentCount in step when a comment leaves or returns to the feed.
async function recount(postId: string) {
  const n = await db.postComment.count({ where: { postId, status: "visible" } });
  await db.post.update({ where: { id: postId }, data: { commentCount: n } }).catch(() => {});
}

export async function POST(req: Request) {
  if (!hit(`admin:${ipFrom(req.headers)}`, 60, 60 * 1000) || !allowed(req)) return notFound();
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return bad("Send JSON.");
  const action = str(b.action);

  if (action === "hidePost" || action === "removePost" || action === "restorePost") {
    const postId = str(b.postId);
    if (!postId) return bad("postId required.");
    const status = action === "hidePost" ? "hidden" : action === "removePost" ? "removed" : "visible";
    const post = await db.post.update({ where: { id: postId }, data: { status } }).catch(() => null);
    if (!post) return bad("No post with that id.");
    if (status !== "visible") await closeReportsFor("post", postId);
    return NextResponse.json({ ok: true, status });
  }

  if (action === "hideComment" || action === "removeComment" || action === "restoreComment") {
    const commentId = str(b.commentId);
    if (!commentId) return bad("commentId required.");
    const status = action === "hideComment" ? "hidden" : action === "removeComment" ? "removed" : "visible";
    const comment = await db.postComment.update({ where: { id: commentId }, data: { status }, select: { postId: true } }).catch(() => null);
    if (!comment) return bad("No comment with that id.");
    await recount(comment.postId);
    if (status !== "visible") await closeReportsFor("comment", commentId);
    return NextResponse.json({ ok: true, status });
  }

  if (action === "dismissReport") {
    const reportId = str(b.reportId);
    if (!reportId) return bad("reportId required.");
    const r = await db.postReport.update({ where: { id: reportId }, data: { status: "dismissed" } }).catch(() => null);
    return r ? NextResponse.json({ ok: true }) : bad("No report with that id.");
  }

  return bad("Unknown action.");
}
