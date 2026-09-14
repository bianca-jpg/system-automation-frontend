import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";

import {
  createStorybookSnapshot,
  startStaticServer,
} from "./a11y-audit.mjs";

const temporaryDirectories = new Set();

const createTemporaryDirectory = async (prefix) => {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  temporaryDirectories.add(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(
    [...temporaryDirectories].map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
  temporaryDirectories.clear();
});

test("serves an immutable snapshot and excludes previous axe results", async () => {
  const fixtureParent = await createTemporaryDirectory("aramis-a11y-source-");
  const sourceRoot = join(fixtureParent, "storybook-static");
  await mkdir(join(sourceRoot, "a11y-results"), { recursive: true });
  await writeFile(
    join(sourceRoot, "index.json"),
    JSON.stringify({ entries: { button: { id: "button", type: "story" } } }),
  );
  await writeFile(join(sourceRoot, "iframe.html"), "snapshot-v1");
  await writeFile(join(sourceRoot, "a11y-results", "stale.json"), "{}");

  const snapshot = await createStorybookSnapshot(sourceRoot);
  temporaryDirectories.add(snapshot.parent);

  await writeFile(join(sourceRoot, "iframe.html"), "rebuilt-v2");

  assert.equal(
    await readFile(join(snapshot.root, "iframe.html"), "utf8"),
    "snapshot-v1",
  );
  assert.equal(existsSync(join(snapshot.root, "a11y-results")), false);
});

test("marks missing static files as infrastructure 404s", async () => {
  const staticRoot = await createTemporaryDirectory("aramis-a11y-server-");
  await writeFile(join(staticRoot, "index.html"), "<!doctype html><title>OK</title>");

  const staticServer = await startStaticServer(staticRoot);
  try {
    const existingResponse = await fetch(`${staticServer.origin}/`);
    assert.equal(existingResponse.status, 200);

    const missingResponse = await fetch(`${staticServer.origin}/missing.js`);
    assert.equal(missingResponse.status, 404);
    assert.equal(
      missingResponse.headers.get("x-a11y-infrastructure-error"),
      "missing-static-file",
    );
    assert.match(await missingResponse.text(), /A11Y infrastructure error/);
    assert.deepEqual([...staticServer.missingRequests], ["/missing.js"]);
  } finally {
    await staticServer.close();
  }
});
