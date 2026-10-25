import { PrototypeScreen } from '../_wire/frame';

export const metadata = { title: 'Prototype · Agency OS' };

export default async function ScreenPage({
  params,
  searchParams,
}: {
  params: Promise<{ screen: string }>;
  searchParams: Promise<{ state?: string; chrome?: string }>;
}) {
  const { screen } = await params;
  const { state = 'default', chrome } = await searchParams;
  return <PrototypeScreen slug={screen} state={state} chrome={chrome !== '0'} />;
}
