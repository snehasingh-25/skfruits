# Merge conflict

Playbook for pulling, divergent branches, and resolving conflicts.

## When you’re about to pull and you have uncommitted work

1. **See state:** `git status`
2. Either **commit** (`git add -A` → `git commit -m "..."`) or **stash** (`git stash push -u -m "wip"`).
3. Then integrate remote (see below).

## When `git pull` asks how to reconcile (divergent branches)

Git wants **merge** or **rebase**. Pick one and stick to it (or set a default once).

| Goal | Command |
|------|---------|
| Merge (extra merge commit, safest default) | `git pull --no-rebase origin main` |
| Rebase (linear history) | `git pull --rebase origin main` |

Optional one-time default:

```bash
git config pull.rebase false   # merge
# or
git config pull.rebase true    # rebase
```

## If you get merge conflicts

1. `git status` — lists **“both modified”** files.
2. Open each file, find `<<<<<<<`, `=======`, `>>>>>>>`, **edit to the final code**, delete markers.
3. `git add <those files>`
4. If **merge:** `git commit` (or `git merge --continue` if Git said you’re in a merge).
5. If **rebase:** `git rebase --continue` (or `git rebase --abort` to cancel).
6. **Push:** `git push origin main`  
   - After **rebase** that already rewrote pushed commits: `git push --force-with-lease` (only when you know it’s safe).

## If `git fetch` shows `origin/main` moved but you didn’t pull yet

Nothing changes on your branch until you **merge/rebase** (e.g. `git pull --no-rebase origin main`).

## Short checklist next time

1. `git status`
2. Commit or stash if dirty
3. `git pull --no-rebase origin main` (or `--rebase`)
4. Fix conflicts → `git add` → commit or `rebase --continue`
5. `git push origin main`

That’s the full loop for: remote changed, you changed things, and Git complained.
