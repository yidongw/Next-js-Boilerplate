'use client';

import type { ColumnDef } from '@tanstack/react-table';

import type { FHEKey } from '@/store/useStore';

export const columns: ColumnDef<FHEKey>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'publicKey',
    header: 'Public Key',
  },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
  },
];
