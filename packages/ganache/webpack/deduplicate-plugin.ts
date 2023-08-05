import { NormalModuleReplacementPlugin } from "webpack";

type Resource = {
  contextInfo: {
    issuer: string;
    issuerLayer: null | unknown;
    compiler?: unknown;
  };
  resolveOptions: unknown;
  context: string;
  request: string;
  dependencies: unknown[];
  fileDependencies: Set<unknown>;
  missingDependencies: Set<unknown>;
  contextDependencies: Set<unknown>;
  createData: CreateData;
  cacheable: boolean;
};

type CreateData = {
  layer: unknown | null;
  request: string;
  userRequest: string;
  rawRequest: string;
  loaders: [];
  resource: string;
  matchResource?: unknown;
  resourceResolveData: {
    context: {
      issuer: string;
      issuerLayer: unknown | null;
      compiler?: unknown;
    };
    path: string;
    request?: unknown;
    query: string;
    fragment: string;
    module: boolean;
    directory: boolean;
    file: boolean;
    internal: boolean;
    fullySpecified: boolean;
    /**
     * package.json
     */
    descriptionFilePath: string;
    descriptionFileData: {
      name: string;
      version: string;
    };
    descriptionFileRoot: string;
    relativePath: string;
  };
  settings: { type: string };
  type: string;
  resolveOptions: unknown;
};

function createMapKey(name: string, version: string, file: string) {
  return `${name}@${version}:${file}`;
}

function createMapKeyFromResource(resource: Resource) {
  const fileData = resource.createData.resourceResolveData.descriptionFileData;
  return createMapKey(
    fileData.name,
    fileData.version,
    resource.createData.resourceResolveData.relativePath
  );
}

class DeduplicatePlugin extends NormalModuleReplacementPlugin {
  constructor() {
    const map = new Map<string, Resource>();
    super(/.*/, (resource: Resource) => {
      if (resource.createData.resourceResolveData == null) {
        return;
      }

      const key = createMapKeyFromResource(resource);
      const canonicalResource = map.get(key);
      if (canonicalResource) {
        resource.request = canonicalResource.request;
        resource.createData = canonicalResource.createData;
      } else {
        map.set(key, resource);
      }
    });
  }
}

export default DeduplicatePlugin;
