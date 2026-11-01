import { notFound } from 'next/navigation';

/**
 * Any other address under a workspace: the workspace's not-found page, inside the workspace,
 * with a 404. It sits outside the (app) group so nothing has streamed before it says so.
 */
export default function MissingPage(): never {
  notFound();
}
