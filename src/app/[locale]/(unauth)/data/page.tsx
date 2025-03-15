'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Clock, Database, FileText, LineChart, Lock, PlusCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/store/useStore';

import { ChatDialog } from './chatDialog';

type DataEntry = {
  id: string;
  name: string;
  size: string;
  encryptedBy: string;
  createdAt: string;
};

type FHEData = {
  id: string;
  keyId: string;
  name: string;
  data: Uint8Array[];
  size: number;
  encryptedBy: string;
  createdAt: string;
};

type RequestInitWithDuplex = RequestInit & {
  duplex?: 'half';
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

// Utility function for truncating text
const truncateText = (text: string, maxLength: number = 8) => {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

// Extracted cell components
const NameCell = ({ value }: { value: string }) => (
  <div className="flex items-center gap-2" title={value}>
    <FileText className="size-4 text-purple-500" />
    <span className="font-medium">{truncateText(value)}</span>
  </div>
);

const KeyCell = ({ value }: { value: string }) => (
  <div className="flex items-center gap-2">
    <Lock className="size-4 text-green-500" />
    <Badge variant="outline" className="bg-green-50 text-green-700">
      {truncateText(value)}
    </Badge>
  </div>
);

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

export default function DataPage() {
  const { fheKeys, fheData, addFheData } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [uploadedData, setUploadedData] = useState<File | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedDataName, setSelectedDataName] = useState('');
  const [selectedDataId, setSelectedDataId] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const columns: ColumnDef<DataEntry, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <NameCell value={row.getValue('name')} />,
    },
    {
      accessorKey: 'size',
      header: 'Size',
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          {row.getValue('size')}
        </Badge>
      ),
    },
    {
      accessorKey: 'encryptedBy',
      header: 'Enc. Key',
      cell: ({ row }) => <KeyCell value={row.getValue('encryptedBy')} />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created At',
      cell: ({ row }) => <DateCell value={row.getValue('createdAt')} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 hover:bg-purple-50 hover:text-purple-700"
            onClick={() => {
              setSelectedDataName(row.getValue('name'));
              setSelectedDataId(row.original.id);
              setChatOpen(true);
            }}
          >
            <LineChart className="size-4" />
            Analyze
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => {
              const removeFheData = useStore.getState().removeFheData;
              removeFheData(row.original.id);
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleDataUpload = async (file: File) => {
    setIsUploading(true);

    try {
      const { default: fhe, TfheClientKey, FheUint32 } = await import('tfhe');

      if (!selectedKey || !newName) {
        return;
      }

      // Read file as text
      const text = await file.text();

      // Parse the text into numbers (assuming CSV or similar format)
      const numbers = text
        .replace(/[[\]]/g, '') // Remove square brackets
        .split(/[,\s]+/) // Split by comma or whitespace
        .map(str => str.trim())
        .filter(str => str !== '')
        .map(str => Number(str)); // Convert to numbers

      // Validate that all values are valid numbers
      if (numbers.some(Number.isNaN)) {
        throw new Error('File contains invalid numbers');
      }

      // Get the key name for encryptedBy
      const keyInfo = fheKeys.find(key => key.id === selectedKey);
      if (!keyInfo) {
        throw new Error('Selected key not found');
      }

      // Initialize TFHE
      await fhe();

      // Deserialize the client key
      const clientKey = TfheClientKey.deserialize(keyInfo.clientKey);

      // Encrypt each number
      const encryptedData = numbers.map((num) => {
        const ciphertext = FheUint32.encrypt_with_client_key(num, clientKey);
        return ciphertext.serialize();
      });

      // Create local FHE data entry
      const newData: FHEData = {
        id: crypto.randomUUID(),
        keyId: selectedKey,
        name: newName,
        data: encryptedData,
        size: numbers.length,
        encryptedBy: keyInfo.name,
        createdAt: new Date().toISOString(),
      };

      // Convert the 2D array into a blob
      const blob = new Blob([JSON.stringify(encryptedData)]);
      // let uploaded = 0;
      // const totalSize = blob.size;

      const stream = blob.stream().pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            // uploaded += chunk.length;
            // const progress = (uploaded / totalSize) * 100;
            // console.log(`Upload progress: ${progress.toFixed(2)}% (${(uploaded / (1024 * 1024)).toFixed(2)}MB / ${(totalSize / (1024 * 1024)).toFixed(2)}MB)`);
            controller.enqueue(chunk);
          },
        }),
      );

      // Send to server
      const response = await fetch(`/api/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Key-ID': selectedKey,
          'X-Data-ID': newData.id,
        },
        body: stream,
        duplex: 'half',
      } as RequestInitWithDuplex);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      // Clean up
      clientKey.free();

      addFheData(newData);
      setNewName('');
      setUploadedData(null);
      setSelectedKey('');
      setIsOpen(false);
    } catch (error) {
      console.error('Error uploading data:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Get filtered data based on selected key
  const formattedData = fheData.map(data => ({
    ...data,
    size: formatFileSize(data.data.length),
    encryptedBy: fheKeys.find(key => key.id === data.keyId)?.name || 'Unknown',
  }));

  return (
    <div>
      <ChatDialog
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        dataName={selectedDataName}
        dataId={selectedDataId}
      />

      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            Encrypted Data
          </h2>
          <p className="text-lg text-gray-600">
            Manage and analyze your encrypted datasets
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="flex items-center gap-2">
              <PlusCircle className="size-5" />
              Create Data
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Data</DialogTitle>
              <DialogDescription>
                Upload and encrypt your data using an FHE key.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                  }}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="data" className="text-right">
                  Data
                </Label>
                <Input
                  id="data"
                  type="file"
                  onChange={e => setUploadedData(e.target.files?.[0] || null)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="key" className="text-right">
                  FHE Key
                </Label>
                <Select value={selectedKey} onValueChange={setSelectedKey}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a key" />
                  </SelectTrigger>
                  <SelectContent>
                    {fheKeys
                      .filter(key => key.status === 'ready')
                      .map(key => (
                        <SelectItem key={key.id} value={key.id}>
                          {key.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  if (uploadedData) {
                    handleDataUpload(uploadedData);
                  }
                }}
                disabled={isUploading}
                type="submit"
              >
                {isUploading
                  ? (
                      <>
                        <span className="mr-2 size-4 animate-spin">⏳</span>
                        Uploading...
                      </>
                    )
                  : (
                      'Create'
                    )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <StatsCard
          title="Total Datasets"
          value={fheData.length}
          description="Encrypted datasets"
          icon={Database}
        />
        <StatsCard
          title="Total Size"
          value={formatFileSize(fheData.reduce((acc, data) => acc + data.data.length, 0))}
          description="Combined data size"
          icon={FileText}
        />
        <StatsCard
          title="Active Keys"
          value={fheKeys.filter(k => k.status === 'ready').length}
          description="Available for encryption"
          icon={Lock}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dataset Management</CardTitle>
          <CardDescription>
            View and analyze your encrypted datasets. Each dataset can be processed securely using homomorphic encryption.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={formattedData} />
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
}: {
  title: string;
  value: string | number;
  description: string;
  icon: any;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
