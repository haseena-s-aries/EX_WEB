/** Only requests that have never been transmitted may be consolidated. */
export function canConsolidate(operation: {status:string;attempts:number;requests:Record<string,unknown>}) {
  return operation.status === 'Pending' && operation.attempts === 0 && Object.keys(operation.requests).length === 0;
}

export function mergeEvidence<T extends {id:string}>(previous:T[] = [], incoming:T[] = []):T[] {
  return [...new Map([...previous,...incoming].map(photo=>[photo.id,photo])).values()];
}
