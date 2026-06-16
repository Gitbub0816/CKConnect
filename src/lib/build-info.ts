import packageJson from "../../package.json";

const commitSha =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
  "";

const deploymentUrl =
  process.env.VERCEL_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL ?? "";

export const buildInfo = {
  commit: commitSha ? commitSha.slice(0, 7) : "local",
  environment:
    process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
  ref: process.env.VERCEL_GIT_COMMIT_REF ?? "local",
  version: packageJson.version,
  deployment: deploymentUrl.replace(/^https?:\/\//, ""),
};

export function buildVersionLabel() {
  const parts = [`v${buildInfo.version}`, buildInfo.commit, buildInfo.environment];
  return parts.filter(Boolean).join(" · ");
}
