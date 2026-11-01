import { cookies } from 'next/headers';
import { PrototypeScreen } from '../_wire/frame';
import { isRole, ROLE_COOKIE } from '../_wire/role';

export const metadata = { title: 'Prototype · Agency OS' };

export default async function ScreenPage({
  params,
  searchParams,
}: {
  params: Promise<{ screen: string }>;
  searchParams: Promise<{ state?: string; chrome?: string; as?: string }>;
}) {
  const { screen } = await params;
  const { state = 'default', chrome, as } = await searchParams;
  // The role picked on the home page (?as=), else the one remembered for this visit.
  const saved = (await cookies()).get(ROLE_COOKIE)?.value;
  const role = isRole(as) ? as : isRole(saved) ? saved : undefined;
  return <PrototypeScreen slug={screen} state={state} chrome={chrome !== '0'} role={role} />;
}
