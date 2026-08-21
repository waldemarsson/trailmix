# Installing trailmix for OpenCode

From the target project, run OpenCode's native plugin installer:

```bash
opencode plugin "trailmix@git+https://github.com/waldemarsson/trailmix.git"
```

Add `--global` to install it for every project. Restart OpenCode. The plugin registers trailmix's
skills and agents and injects its always-on core.

Verify by asking OpenCode to list its skills; names beginning with `trailmix-` should appear.

## Updating

OpenCode caches an unchanged git spec. Replace the configured spec with the desired new commit:

```bash
opencode plugin "trailmix@git+https://github.com/waldemarsson/trailmix.git#<new-commit-sha>" --force
```

Then restart OpenCode. If installation still resolves stale code, clear OpenCode's package cache
and rerun the command. OpenCode config is loaded only at startup.
