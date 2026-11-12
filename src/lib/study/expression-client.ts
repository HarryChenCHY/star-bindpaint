export const EXPRESSION_API = '/api/expression-study';

export class ExpressionRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
export async function expressionRequest<T>(query = '', body?: Record<string,unknown>, token?: string): Promise<T> {
  const response = await fetch(EXPRESSION_API+query, {
    cache:'no-store',
    ...(body ? { method:'POST', body:JSON.stringify(body) } : {}),
    headers: { ...(body ? {'Content-Type':'application/json'} : {}), ...(token ? {Authorization:`Bearer ${token}`} : {}) },
  });
  const data = await response.json();
  if (!response.ok) throw new ExpressionRequestError(data.error || '暂时无法读取或保存。',response.status);
  return data as T;
}
