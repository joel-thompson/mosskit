export const templateDependencyVersions = {
  root: {
    devDependencies: {
      oxlint: "^1.59.0",
      prettier: "^3.8.2",
      typescript: "^5.9.3"
    }
  },
  frontend: {
    dependencies: {
      "@tanstack/react-query": "^5.90.12",
      "@tanstack/react-router": "^1.140.0",
      react: "^19.2.3",
      "react-dom": "^19.2.3",
      shared: "workspace:*",
      tailwindcss: "^4.1.17",
      zod: "^4.2.0"
    },
    devDependencies: {
      "@tanstack/router-plugin": "^1.140.0",
      "@tailwindcss/vite": "^4.1.17",
      "@testing-library/jest-dom": "^6.9.1",
      "@testing-library/react": "^16.3.2",
      "@testing-library/user-event": "^14.6.1",
      "@types/node": "^24.10.2",
      "@types/react": "^19.2.5",
      "@types/react-dom": "^19.2.3",
      "@vitejs/plugin-react": "^5.1.1",
      jsdom: "^28.1.0",
      vite: "^7.2.6",
      vitest: "^4.0.18"
    }
  },
  backend: {
    dependencies: {
      "drizzle-orm": "^0.45.0",
      hono: "^4.10.7",
      postgres: "^3.4.7",
      shared: "workspace:*",
      zod: "^4.2.0"
    },
    devDependencies: {
      "@types/bun": "latest",
      "drizzle-kit": "^0.31.8",
      vitest: "^4.0.18"
    }
  },
  shared: {
    dependencies: {
      zod: "^4.2.0"
    },
    devDependencies: {
      vitest: "^4.0.18"
    }
  },
  features: {
    auth: {
      frontend: {
        dependencies: {
          "@clerk/clerk-react": "^5.58.0"
        }
      },
      backend: {
        dependencies: {
          "@hono/clerk-auth": "^3.0.3"
        }
      }
    },
    shadcn: {
      frontend: {
        dependencies: {
          "class-variance-authority": "^0.7.1",
          clsx: "^2.1.1",
          "tailwind-merge": "^3.4.0"
        }
      }
    }
  }
};

function sortEntries(record) {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)));
}

export function mergeDependencySet(base = {}, overrides = {}) {
  return sortEntries({
    ...base,
    ...overrides
  });
}

export function applyTemplateVersions(manifests, featureIds = []) {
  const nextManifests = {
    root: {
      ...manifests.root,
      devDependencies: mergeDependencySet(
        manifests.root.devDependencies,
        templateDependencyVersions.root.devDependencies
      )
    },
    frontend: {
      ...manifests.frontend,
      dependencies: mergeDependencySet(
        manifests.frontend.dependencies,
        templateDependencyVersions.frontend.dependencies
      ),
      devDependencies: mergeDependencySet(
        manifests.frontend.devDependencies,
        templateDependencyVersions.frontend.devDependencies
      )
    },
    backend: {
      ...manifests.backend,
      dependencies: mergeDependencySet(
        manifests.backend.dependencies,
        templateDependencyVersions.backend.dependencies
      ),
      devDependencies: mergeDependencySet(
        manifests.backend.devDependencies,
        templateDependencyVersions.backend.devDependencies
      )
    },
    shared: {
      ...manifests.shared,
      dependencies: mergeDependencySet(
        manifests.shared.dependencies,
        templateDependencyVersions.shared.dependencies
      ),
      devDependencies: mergeDependencySet(
        manifests.shared.devDependencies,
        templateDependencyVersions.shared.devDependencies
      )
    }
  };

  if (featureIds.includes("auth")) {
    nextManifests.frontend.dependencies = mergeDependencySet(
      nextManifests.frontend.dependencies,
      templateDependencyVersions.features.auth.frontend.dependencies
    );
    nextManifests.backend.dependencies = mergeDependencySet(
      nextManifests.backend.dependencies,
      templateDependencyVersions.features.auth.backend.dependencies
    );
  }

  if (featureIds.includes("shadcn")) {
    nextManifests.frontend.dependencies = mergeDependencySet(
      nextManifests.frontend.dependencies,
      templateDependencyVersions.features.shadcn.frontend.dependencies
    );
  }

  return nextManifests;
}
