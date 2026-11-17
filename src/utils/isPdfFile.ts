export const isPdfFile = (name?: string | null) => /\.pdf(?:[?#].*)?$/i.test(name || '');
