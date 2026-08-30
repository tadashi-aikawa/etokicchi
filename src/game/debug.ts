export function isRandomDebugMode(parameters: URLSearchParams): boolean {
  return parameters.get("debug") === "random";
}
