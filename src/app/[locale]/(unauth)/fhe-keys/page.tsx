'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { AlertCircle, CircleDashed, Clock, Key, Loader2, Shield, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { useStore } from '@/store/useStore';

import { CreateKeyDialog } from './CreateKeyDialog';

type FHEKey = {
  id: string;
  name: string;
  clientKey: Uint8Array;
  createdAt: string;
  status: 'loading' | 'ready' | 'error';
};

// Utility function for truncating text
const truncateText = (text: string, maxLength: number = 8) => {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

// Extracted components to fix React Hooks rule
const NameCell = ({ value }: { value: string }) => (
  <div className="flex items-center gap-2">
    <Key className="size-4 text-purple-500" />
    <span className="font-medium">{truncateText(value)}</span>
  </div>
);

const StatusBadge = ({ status }: { status: FHEKey['status'] }) => {
  const variants = {
    loading: { class: 'bg-yellow-100 text-yellow-800', icon: Loader2 },
    ready: { class: 'bg-green-100 text-green-800', icon: Shield },
    error: { class: 'bg-red-100 text-red-800', icon: AlertCircle },
  };

  const { class: className, icon: Icon } = variants[status];

  return (
    <Badge variant="outline" className={`${className} gap-1`}>
      {status === 'loading' ? <Icon className="size-3 animate-spin" /> : <Icon className="size-3" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

const DateCell = ({ value }: { value: string }) => (
  <div className="flex items-center gap-2 text-gray-600">
    <Clock className="size-4" />
    {new Date(value)
      .toLocaleString(undefined, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}
  </div>
);

const ActionCell = ({ status, id }: { status: FHEKey['status']; id: string }) => {
  const removeFheKey = useStore(state => state.removeFheKey);

  if (status === 'loading') {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Loader2 className="size-4 animate-spin" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => removeFheKey(id)}
      className="text-destructive hover:bg-destructive/10"
    >
      {status === 'error'
        ? (
            <AlertCircle className="size-4" />
          )
        : (
            <Trash2 className="size-4" />
          )}
    </Button>
  );
};

const columns: ColumnDef<FHEKey, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <NameCell value={row.getValue('name')} />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
    cell: ({ row }) => <DateCell value={row.getValue('createdAt')} />,
  },
  {
    id: 'actions',
    cell: ({ row }) => <ActionCell status={row.original.status} id={row.original.id} />,
  },
];

export default function FHEKeysPage() {
  const { fheKeys } = useStore();

  return (
    <div>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            FHE Keys
          </h2>
          <p className="text-lg text-gray-600">
            Manage your Fully Homomorphic Encryption keys
          </p>
        </div>
        <CreateKeyDialog />
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <StatsCard
          title="Total Keys"
          value={fheKeys.length}
          description="Active FHE keys"
          icon={Key}
        />
        <StatsCard
          title="Ready Keys"
          value={fheKeys.filter(k => k.status === 'ready').length}
          description="Keys ready for use"
          icon={Shield}
        />
        <StatsCard
          title="Processing"
          value={fheKeys.filter(k => k.status === 'loading').length}
          description="Keys being generated"
          icon={CircleDashed}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Key Management</CardTitle>
          <CardDescription>
            View and manage your encryption keys. Each key can be used to encrypt data for secure computation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={fheKeys} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  loading,
}: {
  title: string;
  value: number;
  description: string;
  icon: any;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`size-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
