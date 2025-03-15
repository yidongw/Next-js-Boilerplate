import { unstable_setRequestLocale } from 'next-intl/server';

import { Navbar } from '@/components/Navbar';
import { BaseTemplate } from '@/templates/BaseTemplate';

export default function Layout(props: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(props.params.locale);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <BaseTemplate>
        <div className="flex-1 py-5 text-xl [&_p]:my-6">{props.children}</div>
      </BaseTemplate>
    </div>
  );
}
