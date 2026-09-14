import { spawn } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
} from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

export class AuditInfrastructureError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "AuditInfrastructureError";
  }
}

const assertInsideRoot = (root, candidate) =>
  candidate === root || candidate.startsWith(`${root}${sep}`);

export const createStaticRequestHandler = ({
  staticRoot,
  missingRequests,
}) =>
  (request, response) => {
    let requestPath;

    try {
      const rawPath = new URL(
        request.url ?? "/",
        "http://127.0.0.1",
      ).pathname;
      requestPath = decodeURIComponent(
        rawPath === "/" ? "/index.html" : rawPath,
      );
    } catch {
      missingRequests.add(request.url ?? "<invalid-url>");
      response.writeHead(400, {
        "Content-Type": "text/plain; charset=utf-8",
        "X-A11y-Infrastructure-Error": "invalid-static-url",
      });
      response.end("A11Y infrastructure error: invalid static URL.");
      return;
    }

    const relativePath = requestPath.replace(/^[/\\]+/, "");
    const filePath = resolve(staticRoot, relativePath);

    if (!assertInsideRoot(staticRoot, filePath) || !existsSync(filePath)) {
      missingRequests.add(requestPath);
      response.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-A11y-Infrastructure-Error": "missing-static-file",
      });
      response.end(
        `A11Y infrastructure error: static file not found (${requestPath}).`,
      );
      return;
    }

    response.writeHead(200, {
      "Content-Type":
        contentTypes[extname(filePath)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });

    const stream = createReadStream(filePath);
    stream.once("error", () => {
      missingRequests.add(requestPath);
      if (!response.headersSent) {
        response.writeHead(500, {
          "Content-Type": "text/plain; charset=utf-8",
          "X-A11y-Infrastructure-Error": "unreadable-static-file",
        });
        response.end(
          `A11Y infrastructure error: static file could not be read (${requestPath}).`,
        );
        return;
      }
      response.destroy();
    });
    stream.pipe(response);
  };

export async function startStaticServer(staticRoot) {
  const missingRequests = new Set();
  const server = createServer(
    createStaticRequestHandler({ staticRoot, missingRequests }),
  );

  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new AuditInfrastructureError(
      "Não foi possível iniciar o servidor local do snapshot do Storybook.",
    );
  }

  return {
    missingRequests,
    origin: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolveClose, rejectClose) => {
        server.close((error) => {
          if (error) rejectClose(error);
          else resolveClose();
        });
      }),
  };
}

export async function createStorybookSnapshot(
  sourceRoot,
  temporaryRoot = tmpdir(),
) {
  const sourceIndexPath = join(sourceRoot, "index.json");
  if (!existsSync(sourceIndexPath)) {
    throw new AuditInfrastructureError(
      "storybook-static/index.json não existe. Rode `pnpm build-storybook` antes da auditoria estática.",
    );
  }

  const snapshotParent = await mkdtemp(
    join(temporaryRoot, "aramis-ds-a11y-"),
  );
  const snapshotRoot = join(snapshotParent, "storybook-static");
  const sourceResults = join(sourceRoot, "a11y-results");

  try {
    await cp(sourceRoot, snapshotRoot, {
      recursive: true,
      filter: (source) =>
        source !== sourceResults &&
        !source.startsWith(`${sourceResults}${sep}`),
    });
  } catch (error) {
    await rm(snapshotParent, { force: true, recursive: true });
    throw new AuditInfrastructureError(
      "Falha ao criar o snapshot imutável do Storybook. Outro processo pode estar regravando storybook-static; aguarde o build terminar e repita a auditoria.",
      { cause: error },
    );
  }

  for (const requiredFile of ["index.json", "iframe.html"]) {
    if (!existsSync(join(snapshotRoot, requiredFile))) {
      await rm(snapshotParent, { force: true, recursive: true });
      throw new AuditInfrastructureError(
        `Snapshot incompleto: ${requiredFile} não foi encontrado. Outro processo pode ter reconstruído storybook-static durante a cópia.`,
      );
    }
  }

  return {
    parent: snapshotParent,
    root: snapshotRoot,
    cleanup: () => rm(snapshotParent, { force: true, recursive: true }),
  };
}

const replaceAuditResults = async ({ sourceRoot, temporaryResults }) => {
  const outputDirectory = join(sourceRoot, "a11y-results");
  const stagingDirectory = join(
    sourceRoot,
    `.a11y-results-${process.pid}-${Date.now()}`,
  );

  if (
    !assertInsideRoot(sourceRoot, outputDirectory) ||
    !assertInsideRoot(sourceRoot, stagingDirectory)
  ) {
    throw new AuditInfrastructureError(
      "O diretório de resultados da auditoria saiu da raiz do Storybook.",
    );
  }

  try {
    await cp(temporaryResults, stagingDirectory, { recursive: true });
    await rm(outputDirectory, { force: true, recursive: true });
    await rename(stagingDirectory, outputDirectory);
  } catch (error) {
    await rm(stagingDirectory, { force: true, recursive: true });
    throw new AuditInfrastructureError(
      "A auditoria terminou, mas não foi possível publicar os resultados em storybook-static/a11y-results. Outro build pode estar regravando a pasta.",
      { cause: error },
    );
  }
};

const readStoryIds = async (indexPath) => {
  let storybookIndex;
  try {
    storybookIndex = JSON.parse(await readFile(indexPath, "utf8"));
  } catch (error) {
    throw new AuditInfrastructureError(
      "O index.json do snapshot do Storybook está ausente ou inválido.",
      { cause: error },
    );
  }

  const storyIds = Object.values(storybookIndex.entries ?? {})
    .filter((entry) => entry?.type === "story" && typeof entry.id === "string")
    .map((entry) => entry.id)
    .sort();

  if (storyIds.length === 0) {
    throw new AuditInfrastructureError(
      "Nenhuma story foi encontrada no índice estático do Storybook.",
    );
  }

  return storyIds;
};

const assertExecutablePaths = () => {
  const chromePath = process.env.AXE_CHROME_PATH ?? process.env.CHROME_TEST_PATH;
  const chromeDriverPath =
    process.env.AXE_CHROMEDRIVER_PATH ??
    process.env.CHROMEDRIVER_TEST_PATH;

  for (const [name, executablePath] of [
    ["Chrome", chromePath],
    ["ChromeDriver", chromeDriverPath],
  ]) {
    if (executablePath && !existsSync(executablePath)) {
      throw new AuditInfrastructureError(
        `${name} configurado para um caminho inexistente: ${executablePath}`,
      );
    }
  }

  return { chromeDriverPath, chromePath };
};

export async function runAudit() {
  const sourceRoot = resolve("storybook-static");
  const outputDirectory = join(sourceRoot, "a11y-results");
  const { chromeDriverPath, chromePath } = assertExecutablePaths();

  // Never let results from a previous run masquerade as the current audit.
  if (assertInsideRoot(sourceRoot, outputDirectory)) {
    await rm(outputDirectory, { force: true, recursive: true });
  }

  const snapshot = await createStorybookSnapshot(sourceRoot);
  let staticServer;

  try {
    const storyIds = await readStoryIds(join(snapshot.root, "index.json"));
    staticServer = await startStaticServer(snapshot.root);
    const urls = storyIds.map(
      (id) =>
        `${staticServer.origin}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`,
    );

    const preflightResponse = await fetch(urls[0]);
    await preflightResponse.arrayBuffer();
    if (!preflightResponse.ok) {
      throw new AuditInfrastructureError(
        `O snapshot do Storybook respondeu HTTP ${preflightResponse.status} antes da auditoria.`,
      );
    }

    const temporaryResults = join(snapshot.parent, "a11y-results");
    await mkdir(temporaryResults, { recursive: true });

    const axeCli = require.resolve("@axe-core/cli/dist/src/bin/cli.js");
    const args = [
      ...urls,
      "--tags",
      "wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa",
      "--dir",
      temporaryResults,
      "--load-delay",
      "300",
      "--exit",
    ];

    if (chromePath) args.push("--chrome-path", chromePath);
    if (chromeDriverPath) {
      args.push("--chromedriver-path", chromeDriverPath);
    }

    const exitCode = await new Promise((resolveExit, rejectExit) => {
      const audit = spawn(process.execPath, [axeCli, ...args], {
        stdio: "inherit",
        shell: false,
      });
      audit.once("error", (error) =>
        rejectExit(
          new AuditInfrastructureError(
            "Não foi possível iniciar o processo do axe.",
            { cause: error },
          ),
        ),
      );
      audit.once("exit", (code) => resolveExit(code ?? 1));
    });

    if (staticServer.missingRequests.size > 0) {
      const missing = [...staticServer.missingRequests].sort().join(", ");
      throw new AuditInfrastructureError(
        `Auditoria inválida por erro de infraestrutura: o snapshot respondeu 404/erro de leitura para ${missing}. Nenhuma violação desse run deve ser tratada como falha de componente.`,
      );
    }

    const resultFiles = existsSync(temporaryResults)
      ? await readdir(temporaryResults)
      : [];
    if (resultFiles.length === 0) {
      throw new AuditInfrastructureError(
        "O processo do axe terminou sem produzir resultados. Trate o run como erro de infraestrutura, não como violação de componente.",
      );
    }

    await replaceAuditResults({ sourceRoot, temporaryResults });

    if (exitCode !== 0) {
      process.exitCode = exitCode;
    }
  } finally {
    if (staticServer) await staticServer.close();
    await snapshot.cleanup();
  }
}

const isMain =
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  await runAudit();
}
