'use client';

import { PlusCircle } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
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
import type { FHEKey } from '@/store/useStore';
import { useStore } from '@/store/useStore';

type RequestInitWithDuplex = RequestInit & {
  duplex?: 'half';
};

export function CreateKeyDialog() {
  const [newKeyName, setNewKeyName] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { addFheKey, updateFheKeyStatus } = useStore();

  const createNewKey = async () => {
    if (!newKeyName.trim()) {
      return;
    }

    try {
      const {
        default: fheInit,
        TfheClientKey,
        TfheConfigBuilder,
      } = await import('tfhe');
      await fheInit();
      const config = TfheConfigBuilder.default().build();
      const clientKey = TfheClientKey.generate(config);

      const newKey: FHEKey = {
        id: crypto.randomUUID(),
        name: newKeyName,
        clientKey: clientKey.serialize(),
        createdAt: new Date().toISOString(),
        status: 'loading',
      };

      addFheKey(newKey);
      setNewKeyName('');
      setIsOpen(false);

      // Serialize the client key before sending to worker
      const serializedClientKey = clientKey.serialize();
      const worker = new Worker(new URL('./serverKeyWorker.ts', import.meta.url));

      worker.onmessage = async (e) => {
        try {
          if (e.data.error) {
            updateFheKeyStatus(newKey.id, 'error');
            throw new Error(e.data.error);
          }

          const { base64Key } = e.data;
          // console.log('Data size:', base64Key.length / (1024 * 1024), 'MB');

          // let uploaded = 0;
          // const totalSize = base64Key.length;
          const blob = new Blob([base64Key]);

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

          const response = await fetch(`/api/server-key`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'X-Key-ID': newKey.id,
            },
            body: stream,
            duplex: 'half',
          } as RequestInitWithDuplex);

          if (!response.ok) {
            updateFheKeyStatus(newKey.id, 'error');
            const errorText = await response.text();
            throw new Error(`Upload failed: ${response.status} ${errorText}`);
          }

          // console.log('Upload completed successfully!');
          updateFheKeyStatus(newKey.id, 'ready');

          // Clean up
          worker.terminate();
          clientKey.free();
        } catch (error) {
          console.error('Error handling server key:', error);
          updateFheKeyStatus(newKey.id, 'error');
        }
      };

      // Start the worker with serialized client key
      worker.postMessage({ serializedClientKey });
    } catch (error) {
      console.error('Error generating TFHE keys:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <PlusCircle className="size-4" />
          Create FHE Key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a FHE Key</DialogTitle>
          <DialogDescription>
            We do not store your private keys. They are only used to encrypt and decrypt data in the browser.
            Please save your keys in a secure location.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              placeholder="My FHE Key"
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={createNewKey} type="submit">
            Create Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
