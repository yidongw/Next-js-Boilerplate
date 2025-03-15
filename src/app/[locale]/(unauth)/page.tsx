import { Cpu, Database, Key, Lock, MessageSquare, Shield } from 'lucide-react';
import Link from 'next/link';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';

export async function generateMetadata(props: { params: { locale: string } }) {
  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'Index',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default function Index(props: { params: { locale: string } }) {
  unstable_setRequestLocale(props.params.locale);

  return (
    <div className="flex flex-col gap-8 px-4 py-6">
      {/* Hero Section */}
      <section className="mb-12 text-center">
        <h1 className="mb-4 bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-4xl font-bold text-transparent">
          Fully Homomorphic Encryption Demo
        </h1>
        <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
          Experience the power of performing computations on encrypted data while maintaining complete privacy.
        </p>
      </section>

      {/* Features Grid */}
      <div className="mb-12 grid gap-8 md:grid-cols-3">
        <FeatureCard
          icon={Key}
          title="Client-Side Key Generation"
          description="Generate FHE keys securely in your browser. Only you hold the private key, while the server receives what it needs for computation."
        />
        <FeatureCard
          icon={Lock}
          title="Encrypted Data Upload"
          description="Upload and encrypt your sensitive data directly in the browser. Your data remains private throughout its entire lifecycle."
        />
        <FeatureCard
          icon={MessageSquare}
          title="Interactive Analysis"
          description="Chat with your encrypted data. Get insights and perform computations while your data remains encrypted."
        />
      </div>

      {/* How It Works Section */}
      <section className="mb-12 rounded-2xl bg-muted/50 p-8">
        <h2 className="mb-6 text-center text-3xl font-bold text-foreground">How It Works</h2>
        <div className="grid gap-8 md:grid-cols-3">
          <Step
            number={1}
            icon={Shield}
            title="Generate Keys"
            description="Create your FHE keys in the browser. The public parts are sent to the server while your private key never leaves your device."
          />
          <Step
            number={2}
            icon={Database}
            title="Upload Encrypted Data"
            description="Your data is encrypted before being sent to the server. Only you can decrypt it with your private key."
          />
          <Step
            number={3}
            icon={Cpu}
            title="Compute on Encrypted Data"
            description="The server performs calculations on your encrypted data without ever seeing the actual values."
          />
        </div>
      </section>

      {/* Call to Action */}
      <section className="rounded-2xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-12 text-center">
        <h2 className="mb-4 text-2xl font-bold text-foreground">Ready to Try It Out?</h2>
        <p className="mb-6 text-lg text-muted-foreground">
          Start by generating your FHE keys and experience secure computation on encrypted data.
        </p>
        <div className="flex justify-center gap-4">
          <Button
            asChild
            variant="default"
            className="bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700"
          >
            <Link href="/fhe-keys">Generate Keys</Link>
          </Button>
          <Button
            asChild
            variant="default"
            className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <Link href="/data">Upload Data</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-purple-500/50 hover:bg-accent/50">
      <Icon className="mb-4 size-12 text-purple-500" />
      <h3 className="mb-2 text-xl font-semibold text-foreground">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function Step({ number, icon: Icon, title, description }: { number: number; icon: any; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-purple-500/10">
          <Icon className="size-8 text-purple-500" />
        </div>
        <div className="absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-full bg-blue-500 font-bold text-white dark:bg-blue-600">
          {number}
        </div>
      </div>
      <h3 className="mb-2 text-xl font-semibold text-foreground">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
