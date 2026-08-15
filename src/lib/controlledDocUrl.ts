/** Surge free tier blocks PDF; use HTML views for in-browser source links. */
export function controlledViewUrl(assetPath: string): string {
  if (assetPath.endsWith('.pdf')) {
    return assetPath.replace(/\.pdf$/, '.html')
  }
  return assetPath
}
