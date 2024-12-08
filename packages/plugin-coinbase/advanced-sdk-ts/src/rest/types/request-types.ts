export enum method {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
}

export interface RequestOptions {
  method: method;
  endpoint: string;
  queryParams?: Record<string, any>;
  bodyParams?: Record<string, any>;
  isPublic: boolean;
}
