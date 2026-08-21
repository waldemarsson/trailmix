import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import trailmix from "../dist/opencode/plugin.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("OpenCode plugin registers skills and agents", async () => {
  const hooks = await trailmix();
  const config = { skills: { paths: ["custom"] }, agent: {} };

  hooks.config(config);
  hooks.config(config);

  assert.equal(config.skills.paths[0], "custom");
  assert.equal(config.skills.paths.filter((path) => path.endsWith("/dist/opencode/skills")).length, 1);
  assert.equal(config.agent["trailmix-implementer"].mode, "subagent");
  assert.deepEqual(config.agent["trailmix-explorer"].permission, {
    "*": "deny",
    read: "allow",
    glob: "allow",
    grep: "allow",
    list: "allow",
    webfetch: "allow",
    websearch: "allow",
    task: "deny",
    edit: "deny",
    bash: "deny",
    external_directory: {
      "*": "ask",
      [config.skills.paths[1] + "/*"]: "allow",
    },
  });
  assert.deepEqual(config.agent["trailmix-implementer"].permission, {
    "*": "deny",
    read: "allow",
    edit: "allow",
    glob: "allow",
    grep: "allow",
    list: "allow",
    bash: "allow",
    task: "deny",
    external_directory: {
      "*": "ask",
      [config.skills.paths[1] + "/*"]: "allow",
    },
  });
  assert.equal(config.agent["trailmix-documenter"].permission.task, "deny");
  assert.equal(config.agent["trailmix-reviewer"].permission.bash, "deny");
});

test("OpenCode plugin preserves generated permissions under partial user overrides", async () => {
  const hooks = await trailmix();
  const config = {
    agent: {
      "trailmix-reviewer": {
        permission: {
          webfetch: "allow",
          external_directory: { "/tmp/reviews/*": "allow" },
        },
      },
      "trailmix-explorer": { model: "example/model" },
      "trailmix-implementer": { permission: { bash: { "rm *": "deny" } } },
    },
  };

  hooks.config(config);

  assert.equal(config.agent["trailmix-reviewer"].permission.edit, "deny");
  assert.equal(config.agent["trailmix-reviewer"].permission.webfetch, "allow");
  assert.equal(config.agent["trailmix-reviewer"].permission.external_directory["*"], "ask");
  assert.equal(
    config.agent["trailmix-reviewer"].permission.external_directory["/tmp/reviews/*"],
    "allow"
  );
  assert.equal(config.agent["trailmix-explorer"].permission.bash, "deny");
  assert.equal(config.agent["trailmix-explorer"].model, "example/model");
  assert.deepEqual(config.agent["trailmix-implementer"].permission.bash, {
    "*": "allow",
    "rm *": "deny",
  });
});

test("packed repository exposes a loadable OpenCode plugin with every generated asset", async () => {
  const temp = mkdtempSync(join(tmpdir(), "trailmix-package-"));
  const packed = JSON.parse(
    execFileSync("npm", ["pack", "--json", "--pack-destination", temp, ROOT], {
      encoding: "utf8",
    })
  )[0];
  const install = join(temp, "install");
  execFileSync("npm", ["install", "--ignore-scripts", "--prefix", install, join(temp, packed.filename)]);

  const packageRoot = join(install, "node_modules/trailmix");
  const pkg = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
  assert.equal(pkg.private, undefined);
  assert.equal(pkg.main, "dist/opencode/plugin.js");

  const installed = await import(pathToFileURL(join(packageRoot, pkg.main)));
  const hooks = await installed.default();
  const config = {};
  hooks.config(config);
  for (const name of ["explorer", "implementer", "reviewer", "documenter"]) {
    assert.ok(config.agent[`trailmix-${name}`]);
    assert.ok(existsSync(join(packageRoot, `dist/opencode/agents/trailmix-${name}.md`)));
  }
  for (const name of ["trailhead", "discuss", "plan", "implement", "review", "document"]) {
    assert.ok(existsSync(join(packageRoot, `dist/opencode/skills/trailmix-${name}/SKILL.md`)));
  }
});

test("OpenCode plugin injects bootstrap once", async () => {
  const hooks = await trailmix();
  const output = {
    messages: [{ info: { role: "user" }, parts: [{ type: "text", text: "Build it" }] }],
  };

  await hooks["experimental.chat.messages.transform"]({}, output);
  await hooks["experimental.chat.messages.transform"]({}, output);

  assert.equal(
    output.messages[0].parts.filter(
      (part) => part.type === "text" && part.text.includes("<TRAILMIX_BOOTSTRAP>")
    ).length,
    1
  );
});
