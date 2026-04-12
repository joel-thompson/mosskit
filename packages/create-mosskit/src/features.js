import { templateDependencyVersions } from "./dependency-versions.js";

export const featureRegistry = {
  auth: {
    id: "auth",
    displayName: "Auth",
    summary: "Clerk authentication",
    readmeLabel: "Clerk authentication",
    overlayDirectory: "auth",
    dependencies: templateDependencyVersions.features.auth,
    envExamples: {
      frontend: ["VITE_CLERK_PUBLISHABLE_KEY=pk_test_replace_me"],
      backend: [
        "CLERK_PUBLISHABLE_KEY=pk_test_replace_me",
        "CLERK_SECRET_KEY=sk_test_replace_me"
      ]
    },
    setupNotes: ["Fill in your Clerk keys in both env files."]
  },
  shadcn: {
    id: "shadcn",
    displayName: "shadcn/ui",
    summary: "shadcn/ui starter components",
    readmeLabel: "shadcn/ui starter components",
    overlayDirectory: "shadcn",
    dependencies: templateDependencyVersions.features.shadcn,
    envExamples: {
      frontend: [],
      backend: []
    },
    setupNotes: []
  }
};

export function listFeatureIds() {
  return Object.keys(featureRegistry);
}

export function listFeatures() {
  return listFeatureIds().map((featureId) => featureRegistry[featureId]);
}

export function getFeature(featureId) {
  return featureRegistry[featureId];
}

export function isFeatureSupported(featureId) {
  return Boolean(getFeature(featureId));
}

export function normalizeFeatureIds(featureIds) {
  return [...new Set(featureIds)].sort();
}
