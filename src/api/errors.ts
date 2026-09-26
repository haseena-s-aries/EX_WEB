export function getApiErrorMessage(error: any, fallback: string) {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (status === 401) {
    return 'Your session has expired. Please log in again.';
  }
  if (status === 403) {
    return 'You do not have permission to view this project.';
  }

  if (data?.errors && typeof data.errors === 'object') {
    const validationMessages = Object.values(data.errors)
      .flatMap(value => (Array.isArray(value) ? value : [value]))
      .filter(value => typeof value === 'string') as string[];
    if (validationMessages.length > 0) {
      return validationMessages.join(' ');
    }
  }

  return data?.error || data?.message || fallback;
}
