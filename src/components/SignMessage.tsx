'use client';
import { Loader2 } from 'lucide-react';
import { type ChangeEvent, type FC, type MouseEvent, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useSignMessageHook } from '@/hooks/useSignMessageHook';

const SignMessage: FC = () => {
  const { signature, recoveredAddress, error, isPending, signMessage } = useSignMessageHook();
  const [messageAuth, setMessageAuth] = useState<string>('');
  const { toast } = useToast();

  const handleMessageChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setMessageAuth(e.target.value);
  };

  const handleSignMessage = (e: MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    signMessage({ message: messageAuth });
  };

  useEffect(() => {
    if (signature && recoveredAddress) {
      toast({
        title: 'Message successfully signed!',
        description: (
          <>
            <b>Signature:</b>
            {' '}
            {signature}
            <br />
            <br />
            <b>Recovered Address:</b>
            {' '}
            {recoveredAddress}
          </>
        ),
      });
    }

    if (error) {
      toast({
        title: 'An error occured:',
        description: error.message,
      });
    }
  }, [signature, recoveredAddress, error, toast]);

  return (
    <div className="flex w-[45%] min-w-[270px] flex-col gap-2 rounded-md border border-gray-300 p-4">
      Sign Message
      <Input
        value={messageAuth}
        onChange={handleMessageChange}
        type="textarea"
        placeholder="Enter message to sign"
      />
      <Button
        variant="ghost"
        onClick={handleSignMessage}
      >
        {isPending
          ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading...
              </>
            )
          : (
              'Sign Message'
            )}
      </Button>
    </div>
  );
};

export default SignMessage;
