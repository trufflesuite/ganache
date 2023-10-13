import { NormalModuleReplacementPlugin, ResolveData } from "webpack";

function createMapKey(name: string, version: string, file: string) {
  return `${name}@${version}:${file}`;
}

function createMapKeyFromResource(resource: ResolveData) {
  const fileData = resource.createData.resourceResolveData!.descriptionFileData;
  return createMapKey(
    fileData.name,
    fileData.version,
    resource.createData.resourceResolveData!.relativePath
  );
}

class DeduplicatePlugin extends NormalModuleReplacementPlugin {
  constructor() {
    const map = new Map<string, ResolveData>();
    super(/.*/, (resource: ResolveData) => {
      if (resource.createData.resourceResolveData == null) {
        return;
      }

      const key = createMapKeyFromResource(resource);
      const canonicalResource = map.get(key);
      if (canonicalResource) {
        if (
          resource.createData.resourceResolveData!.descriptionFileData.name &&
          resource.createData.resourceResolveData!.descriptionFileData.name.startsWith(
            "@ethereumjs"
          )
        ) {
          console.log(
            resource.createData.resourceResolveData!.descriptionFileData.name
          );
        }
        if (
          resource.createData.resourceResolveData!.descriptionFileData.name ===
            "@ethereumjs/statemanager" ||
          !resource.createData.resourceResolveData!.descriptionFileData.name ||
          resource.createData.resourceResolveData!.descriptionFileData.name ===
            "undefined"
        ) {
          console.log(
            resource,
            resource.createData.resourceResolveData!.descriptionFileData
          );
        }
        resource.request = canonicalResource.request;
        resource.createData = canonicalResource.createData;
      } else {
        map.set(key, resource);
      }
    });
  }
}

export default DeduplicatePlugin;
