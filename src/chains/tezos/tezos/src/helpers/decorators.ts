import "reflect-metadata";
import * as t from "io-ts";

function _configureEndpointForParameter(
  target: any,
  propertyKey: string,
  parameter: Parameter
) {
  _addEndpointsIfDoesNotExist(target);
  const existingEndpointsConfig: EndpointConfig[] = Reflect.get(
    target,
    "endpoints-config"
  );
  const existingEndpointConfig: EndpointConfig = existingEndpointsConfig.find(
    f => f.url === propertyKey
  );
  if (!existingEndpointConfig) {
    const endpointDetails: EndpointConfig = {
      url: propertyKey,
      parameters: [parameter]
    };
    Reflect.set(target, "endpoints-config", [
      ...existingEndpointsConfig,
      endpointDetails
    ]);
  } else {
    existingEndpointConfig.parameters.push(parameter);
    existingEndpointsConfig[propertyKey] = existingEndpointConfig;
    Reflect.set(target, "endpoints-config", [...existingEndpointsConfig]);
  }
}

function _configureEndpointMethod(
  target: any,
  propertyKey: string,
  endpointMethod: EndpointMethod
) {
  _addEndpointsIfDoesNotExist(target);
  const existingEndpointsConfig = Reflect.get(target, "endpoints-config");
  const existingEndpointConfig: EndpointConfig = existingEndpointsConfig.find(
    f => f.url === propertyKey
  );
  if (!existingEndpointConfig) {
    const endpointDetails: EndpointConfig = {
      method: endpointMethod,
      url: propertyKey,
      parameters: []
    };
    Reflect.set(target, "endpoints-config", [
      ...existingEndpointsConfig,
      endpointDetails
    ]);
  } else {
    existingEndpointConfig.method = endpointMethod;
    existingEndpointsConfig[propertyKey] = existingEndpointConfig;
    Reflect.set(target, "endpoints-config", [...existingEndpointsConfig]);
  }
}

function _addEndpointsIfDoesNotExist(target: any) {
  if (!target["endpoints-config"]) {
    Reflect.defineProperty(target, "endpoints-config", {
      enumerable: true,
      writable: true,
      value: []
    });
  }
}

export function Get(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  _configureEndpointMethod(target, propertyKey, EndpointMethod.Get);
}
export function Post(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  _configureEndpointMethod(target, propertyKey, EndpointMethod.Post);
}
export function Put(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  _configureEndpointMethod(target, propertyKey, EndpointMethod.Put);
}
export function Delete(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  _configureEndpointMethod(target, propertyKey, EndpointMethod.Delete);
}
export function FromUrl(name: string, type: unknown) {
  return function (target: Object, propertyName: string, index: number) {
    const parameter: Parameter = {
      name,
      required: true,
      category: ParameterCategory.Url,
      index,
      type
    };
    _configureEndpointForParameter(target, propertyName, parameter);
  };
}

export function FromQuery(name: string, required: boolean, type: unknown) {
  return function (target: Object, propertyName: string, index: number) {
    const parameter: Parameter = {
      name,
      required,
      category: ParameterCategory.Query,
      index,
      type
    };
    _configureEndpointForParameter(target, propertyName, parameter);
  };
}

export function FromBody<T>(name: string, type: t.Type<T> | undefined) {
  return function (target: Object, propertyName: string, index: number) {
    const parameter: Parameter = {
      name,
      required: true,
      category: ParameterCategory.Body,
      index,
      type
    };
    _configureEndpointForParameter(target, propertyName, parameter);
  };
}

export interface EndpointConfig {
  method?: EndpointMethod;
  url: string;
  parameters: Parameter[];
}

export class Parameter {
  name: string;
  required: boolean;
  category: ParameterCategory;
  index: number;
  type: unknown;
}

export enum ParameterCategory {
  Url,
  Query,
  Body
}
export enum EndpointMethod {
  Get,
  Post,
  Put,
  Delete
}
export enum SpecialQueryParameter {
  active = "active",
  inactive = "inactive",
  all = "all"
}
