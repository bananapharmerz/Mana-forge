# Restoring Mana Forge from a backup

Rehearsed on 9 October 2026 with the 03:15 UTC backup of that day. The file was intact (`PRAGMA integrity_check` = ok), every table matched live, the three newer migrations applied cleanly, and a test copy of the site served /, /decks, /commanders and /prices from it. A full restore takes about 10 minutes, most of it the redeploy.

## Where backups are

- **Server:** `/root/backups/manaforge-YYYY-MM-DD.db.gz`, written every night at 03:15 UTC.
- **Owner's PC:** `C:\Users\scigu\mtg-hub\backups\live\`. Nexus copies the newest one every day and keeps 14.

## Rehearsal (safe, nothing live is touched)

```powershell
cd C:\Users\scigu\nexus
node scripts\restore-test.mjs C:\Users\scigu\mtg-hub\backups\live\manaforge-YYYY-MM-DD.db.gz C:\Users\scigu\nexus\data\restore-test\manaforge.db C:\Users\scigu\mtg-hub\backups\live\mirror.db
```

This prints the integrity check and row counts next to live. Tables created after the backup show as `missing`; that's expected.

## Real restore (the live database is lost or broken)

1. In Coolify, **stop** the Mana Forge app.
2. On the server, keep the broken copy and put the backup in place:
   ```sh
   V=/var/lib/docker/volumes/hfntlfrkbym9pk0z0laag0fb-manaforge-data/_data
   cp $V/manaforge.db $V/manaforge.db.broken-$(date +%F-%H%M) 2>/dev/null
   rm -f $V/manaforge.db-wal $V/manaforge.db-shm
   gunzip -c /root/backups/manaforge-YYYY-MM-DD.db.gz > $V/manaforge.db
   sqlite3 $V/manaforge.db "PRAGMA integrity_check;"   # must print: ok
   ```
3. In Coolify, **start** (or redeploy) the app. Missing migrations apply on start.
4. Check that https://manaforgehub.com/decks loads and that you can sign in.
5. Anything written between the backup and the failure (new accounts, decks, payments) is gone. Check Stripe for payments in that window and re-link them by hand.
