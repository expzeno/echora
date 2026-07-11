export interface ApiResponse<T = any> {
  ok: boolean;
  message?: string;
  code?: string;
  traceId?: string;
  detail?: T;
  list?: T[];
  items?: T[];
  total?: number;
}
