import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import path from "node:path";

export const baseline = "6704b108306b14aa08284084bd099f91c610443d";
// Bundle the old rule sources directly from Git, without switching the user's worktree.
export async function loadTS(file) {
  const result = await build({ entryPoints: [file], bundle: true, format: "esm", write: false });
  return import(
    "data:text/javascript;base64," + Buffer.from(result.outputFiles[0].contents).toString("base64")
  );
}
export async function buildBaseline() {
  const archive = {
    name: "original",
    setup(b) {
      b.onResolve({ filter: /.*/ }, (args) => {
        if (args.path === "react") return { path: "react", external: true };
        const name = path.posix.normalize(
          path.posix.join(path.posix.dirname(args.importer || "."), args.path),
        );
        return { path: name.endsWith(".ts") ? name : name + ".ts", namespace: "archive" };
      });
      b.onLoad({ filter: /.*/, namespace: "archive" }, (args) => ({
        contents:
          execFileSync("git", ["show", baseline + ":" + args.path], { encoding: "utf8" }) +
          (args.path.endsWith("/useSessionStats.ts") ? "\nexport { getRepUpdate, updateStats };" : ""),
        loader: "ts",
      }));
    },
  };
  await build({
    stdin: {
      contents: [
        'export { analyzePose } from "./src/lib/pose/poseRules";',
        'export { EMPTY_STATS } from "./src/lib/pose/poseTypes";',
        'export { getRepUpdate, updateStats } from "./src/hooks/useSessionStats";',
        'export { buildSetFeedback } from "./src/lib/pose/setFeedback";',
      ].join("\n"),
    },
    bundle: true,
    format: "esm",
    plugins: [archive],
    outfile: "validation/.assets/baseline.mjs",
  });
}
