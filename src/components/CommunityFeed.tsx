"use client";

import { type ReactNode, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SupporterBadge from "@/components/SupporterBadge";
import {
  acceptCommunityRules,
  addComment,
  createPost,
  removeOwn,
  reportContent,
  votePost,
} from "@/app/actions/feed";
import { MAX_COMMENT, MAX_POST } from "@/lib/feedConstants";

export type FeedComment = { id: string; body: string; author: string; ago: string; mine: boolean };
export type FeedPost = {
  id: string;
  kind: "deck" | "text";
  body: string | null;
  author: string;
  authorTier: string;
  ago: string;
  deck: { id: string; name: string; commander: string } | null;
  score: number;
  voted: boolean;
  mine: boolean;
  comments: FeedComment[];
};
type DeckOpt = { id: string; name: string; commander: string };

export default function CommunityFeed({
  posts,
  signedIn,
  needsOptin,
  decks,
}: {
  posts: FeedPost[];
  signedIn: boolean;
  needsOptin: boolean;
  decks: DeckOpt[];
}) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {signedIn ? (
        needsOptin ? (
          <RulesGate onDone={() => router.refresh()} />
        ) : (
          <Composer decks={decks} onDone={() => router.refresh()} />
        )
      ) : (
        <div className="card-frame mb-6 p-5 text-sm text-muted">
          <Link href="/login?callbackUrl=/community" className="text-gold-bright underline">
            Sign in
          </Link>{" "}
          to share a deck, post and join the conversation.
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {posts.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            Nothing here yet — be the first to share a deck or a hot take. 🔥
          </p>
        )}
        {posts.map((p) => (
          <PostCard key={p.id} post={p} signedIn={signedIn} onChange={() => router.refresh()} />
        ))}
      </div>
    </div>
  );
}

function RulesGate({ onDone }: { onDone: () => void }) {
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="card-frame p-5">
      <h2 className="font-display text-lg font-semibold text-foreground">Join the community</h2>
      <p className="mt-2 text-sm text-muted">A few house rules before you post:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
        <li>Keep it about Magic and keep it friendly — no harassment, hate or NSFW.</li>
        <li>No spam or self-promo floods.</li>
        <li>Posts and comments can be reported and removed by moderators.</li>
      </ul>
      <button
        onClick={() =>
          start(async () => {
            setErr(null);
            const r = await acceptCommunityRules();
            if (r.ok) onDone();
            else setErr(r.error);
          })
        }
        disabled={busy}
        className="mt-4 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
      >
        {busy ? "..." : "Agree & join"}
      </button>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  );
}

function Tab({ active, onClick, disabled, children }: { active: boolean; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-40 ${active ? "bg-gold text-black" : "text-muted hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function Composer({ decks, onDone }: { decks: DeckOpt[]; onDone: () => void }) {
  const [kind, setKind] = useState<"text" | "deck">("text");
  const [body, setBody] = useState("");
  const [deckId, setDeckId] = useState(decks[0]?.id ?? "");
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    start(async () => {
      setErr(null);
      const r = await createPost(kind, body, kind === "deck" ? deckId : null);
      if (r.ok) {
        setBody("");
        onDone();
      } else setErr(r.error);
    });
  }

  return (
    <div className="card-frame p-4">
      <div className="mb-3 flex gap-2">
        <Tab active={kind === "text"} onClick={() => setKind("text")}>Post</Tab>
        <Tab active={kind === "deck"} onClick={() => setKind("deck")}>Share a deck</Tab>
      </div>
      {kind === "deck" &&
        (decks.length ? (
          <select
            value={deckId}
            onChange={(e) => setDeckId(e.target.value)}
            className="mb-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none"
          >
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.commander}
              </option>
            ))}
          </select>
        ) : (
          <p className="mb-2 text-sm text-muted">
            You don&apos;t have a public deck yet.{" "}
            <Link href="/deck-builder" className="text-gold-bright underline">
              Build one
            </Link>{" "}
            and make it public to share it here.
          </p>
        ))}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={MAX_POST}
        rows={kind === "deck" ? 2 : 4}
        placeholder={kind === "deck" ? "Say something about it (optional)" : "What's on your mind, planeswalker?"}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted/70 focus:border-gold focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted">{body.length}/{MAX_POST}</span>
        <button
          onClick={submit}
          disabled={busy || (kind === "deck" && !deckId)}
          className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
        >
          {busy ? "Posting..." : "Post"}
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  );
}

function PostCard({ post, signedIn, onChange }: { post: FeedPost; signedIn: boolean; onChange: () => void }) {
  const [showComments, setShowComments] = useState(false);
  return (
    <div className="card-frame p-4">
      <div className="flex items-center gap-1.5 text-sm">
        <span className="font-medium text-foreground">{post.author}</span>
        <SupporterBadge tier={post.authorTier} />
        <span className="text-xs text-muted">· {post.ago}</span>
        {post.mine && <RemoveBtn kind="post" id={post.id} onDone={onChange} />}
      </div>

      {post.body && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">{post.body}</p>}

      {post.deck && (
        <Link
          href={`/decks/view/${post.deck.id}`}
          className="mt-3 block rounded-lg border border-border bg-surface p-3 hover:border-gold"
        >
          <p className="text-[10px] uppercase tracking-wide text-muted">Deck</p>
          <p className="text-sm font-semibold text-foreground">{post.deck.name}</p>
          <p className="text-xs text-gold-bright">{post.deck.commander}</p>
        </Link>
      )}

      <div className="mt-3 flex items-center gap-4 text-sm">
        <UpvoteButton post={post} signedIn={signedIn} />
        <button onClick={() => setShowComments((v) => !v)} className="text-muted hover:text-foreground">
          💬 {post.comments.length}
        </button>
        <ReportBtn postId={post.id} />
      </div>

      {showComments && <CommentSection post={post} signedIn={signedIn} onChange={onChange} />}
    </div>
  );
}

function UpvoteButton({ post, signedIn }: { post: FeedPost; signedIn: boolean }) {
  const [voted, setVoted] = useState(post.voted);
  const [score, setScore] = useState(post.score);
  const [busy, start] = useTransition();
  return (
    <button
      disabled={busy || !signedIn}
      title={signedIn ? undefined : "Sign in to upvote"}
      onClick={() =>
        start(async () => {
          const r = await votePost(post.id);
          if (r.ok) {
            setVoted(r.voted);
            setScore((s) => s + (r.voted ? 1 : -1));
          }
        })
      }
      className={`flex items-center gap-1 disabled:opacity-50 ${voted ? "text-gold-bright" : "text-muted hover:text-foreground"}`}
    >
      ▲ {score}
    </button>
  );
}

function CommentSection({ post, signedIn, onChange }: { post: FeedPost; signedIn: boolean; onChange: () => void }) {
  const [body, setBody] = useState("");
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="mt-3 border-t border-border pt-3">
      {post.comments.length === 0 && <p className="text-xs text-muted">No comments yet.</p>}
      <div className="flex flex-col gap-2">
        {post.comments.map((c) => (
          <div key={c.id} className="text-sm">
            <span className="font-medium text-foreground">{c.author}</span>
            <span className="text-xs text-muted"> · {c.ago}</span>
            {c.mine && <RemoveBtn kind="comment" id={c.id} onDone={onChange} />}
            <p className="whitespace-pre-wrap break-words text-foreground">{c.body}</p>
          </div>
        ))}
      </div>
      {signedIn && (
        <div className="mt-2 flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={MAX_COMMENT}
            placeholder="Add a comment"
            className="flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground placeholder:text-muted/70 focus:border-gold focus:outline-none"
          />
          <button
            disabled={busy || !body.trim()}
            onClick={() =>
              start(async () => {
                setErr(null);
                const r = await addComment(post.id, body);
                if (r.ok) {
                  setBody("");
                  onChange();
                } else setErr(r.error);
              })
            }
            className="rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
          >
            Send
          </button>
        </div>
      )}
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}

function RemoveBtn({ kind, id, onDone }: { kind: "post" | "comment"; id: string; onDone: () => void }) {
  const [busy, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => { const r = await removeOwn(kind, id); if (r.ok) onDone(); })}
      disabled={busy}
      className="ml-2 text-xs text-muted hover:text-red-500"
    >
      remove
    </button>
  );
}

function ReportBtn({ postId, commentId }: { postId?: string; commentId?: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, start] = useTransition();
  if (done) return <span className="text-xs text-muted">Reported ✓</span>;
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="text-xs text-muted hover:text-foreground">
        report
      </button>
      {open && (
        <div className="absolute z-10 mt-1 flex flex-col rounded-md border border-border bg-surface-raised p-1 text-xs shadow-lg">
          {(["spam", "offensive", "copyright", "other"] as const).map((r) => (
            <button
              key={r}
              disabled={busy}
              onClick={() =>
                start(async () => {
                  const res = await reportContent(postId ?? null, commentId ?? null, r);
                  if (res.ok) {
                    setDone(true);
                    setOpen(false);
                  }
                })
              }
              className="rounded px-3 py-1 text-left capitalize text-foreground hover:bg-surface"
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
