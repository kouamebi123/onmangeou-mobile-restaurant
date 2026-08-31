import catalog from '@/i18n/fr-CI.json';

type MessageTree = { [key: string]: string | MessageTree };

function lookup(tree: MessageTree, path: string): string | undefined {
  const parts = path.split('.');
  let current: string | MessageTree | undefined = tree;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null || !(part in current)) {
      return undefined;
    }
    current = current[part as keyof typeof current];
  }
  return typeof current === 'string' ? current : undefined;
}

export function t(path: string, vars?: Record<string, string>): string {
  const template = lookup(catalog as MessageTree, path) ?? path;
  if (!vars) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? `{${name}}`);
}
