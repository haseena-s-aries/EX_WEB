export function getApiErrorMessage(error: any, fallback: string) {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (status === 401) {
    return 'Your session has expired. Please log in again.';
  }
  if (status === 403) {
    return 'You do not have permission to view this project.';
  }

  return data?.error || data?.message || fallback;
}
