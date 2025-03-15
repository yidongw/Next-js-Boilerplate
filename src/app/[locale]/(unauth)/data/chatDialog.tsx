import { Buffer } from 'buffer';
import { Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { setTimeout } from 'timers';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/store/useStore';

type Message = {
  id: string;
  content: string;
  isUser: boolean;
  isEncrypted: boolean;
  timestamp: string;
  encryptedContent?: string;
  isDecrypted?: boolean;
};

// // Example server responses
// const serverResponses = [
//   'I\'ve analyzed the data pattern and found some interesting correlations.',
//   'The encrypted data shows a clear trend in the specified timeframe.',
//   'Based on the homomorphic computation, the results indicate positive growth.',
//   'The analysis suggests there might be some anomalies in the dataset.',
//   'I\'ve completed the secure computation on your encrypted data.',
// ];

type ChatDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  dataName: string;
  dataId: string;
};

const validOperations = ['sum', 'avg', 'min', 'max'] as const;

export function ChatDialog({ isOpen, onClose, dataName, dataId }: ChatDialogProps) {
  const { addMessageToData, getMessagesForData } = useStore();
  const messages = useStore(_ => getMessagesForData(dataId));
  const [newMessage, setNewMessage] = useState('');
  const [isEncrypted, setIsEncrypted] = useState<'plain' | 'encrypted'>('plain');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with welcome message if no messages exist
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage = {
        id: crypto.randomUUID(),
        content: `Hello! I'm ready to help you analyze "${dataName}". What would you like to know?`,
        isUser: false,
        isEncrypted: false,
        timestamp: new Date().toISOString(),
      };
      addMessageToData(dataId, welcomeMessage);
    }
  }, [dataId, dataName, addMessageToData, messages.length]);

  const getServerResponse = async (userInput: string): Promise<Message> => {
    const trimmedInput = userInput.trim().toLowerCase();
    const operation = validOperations.find(op => trimmedInput.includes(op));

    // Create base message structure
    const baseMessage = {
      id: crypto.randomUUID(),
      isUser: false,
      isEncrypted: false,
      timestamp: new Date().toISOString(),
    };

    if (operation) {
      // Create loading message
      const loadingMessage = {
        ...baseMessage,
        content: `⏳ Processing ${operation} request...`,
      };

      // Start the fetch request but don't await it
      fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data_id: dataId,
          request: operation,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Server response was not ok');
          }
          return response.json();
        })
        .then((jsonResponse) => {
          useStore.getState().updateMessage(dataId, baseMessage.id, {
            ...baseMessage,
            content: `Encrypted ${operation} result (click to decrypt)`,
            isEncrypted: true,
            encryptedContent: jsonResponse.result,
            isDecrypted: false,
          });
        })
        .catch((error) => {
          console.error('Error processing request:', error);
          useStore.getState().updateMessage(dataId, baseMessage.id, {
            ...baseMessage,
            content: 'Sorry, there was an error processing your request. Please try again.',
          });
        });

      // Return loading message immediately
      return loadingMessage;
    }

    // Handle invalid operations with help message
    return {
      ...baseMessage,
      content: `I can help you analyze your data using these operations: ${validOperations.join(', ')}. Please try one of these commands.`,
    };
  };

  const handleDecrypt = async (messageId: string, encryptedContent: string) => {
    const { default: fhe, TfheClientKey, FheUint32 } = await import('tfhe');
    // Initialize TFHE
    await fhe();

    try {
      const paddedContent = encryptedContent + '='.repeat((4 - encryptedContent.length % 4) % 4);

      // Use base64-js instead of Buffer
      const bytes = Buffer.from(paddedContent, 'base64');
      // Get the client key from the store
      const data = useStore.getState().fheData.find(d => d.id === dataId);
      const key = useStore.getState().fheKeys.find(k => k.id === data?.keyId);

      if (!key?.clientKey) {
        throw new Error('Client key not found');
      }

      // Deserialize and decrypt
      const clientKey = TfheClientKey.deserialize(key.clientKey);
      const ciphertext = FheUint32.deserialize(bytes);
      const decryptedValue = ciphertext.decrypt(clientKey);

      useStore.getState().updateMessageDecryptedContent(
        dataId,
        messageId,
        `Decrypted value: ${decryptedValue}`,
      );
    } catch (error) {
      console.error('Decryption failed:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) {
      return;
    }

    // Add user message
    const userMessage = {
      id: crypto.randomUUID(),
      content: newMessage,
      isUser: true,
      isEncrypted: isEncrypted === 'encrypted',
      timestamp: new Date().toISOString(),
    };
    addMessageToData(dataId, userMessage);

    // Get and add server response
    const serverMessage = await getServerResponse(newMessage);
    addMessageToData(dataId, serverMessage);

    setNewMessage('');

    // Scroll to bottom after messages update
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex h-[80vh] flex-col sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            Analyzing:
            {' '}
            {dataName}
          </DialogTitle>
          <DialogDescription>
            Chat with your data using plain or encrypted messages using FHE.
          </DialogDescription>
        </DialogHeader>

        {/* Messages Container */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                <div className="text-sm">
                  {message.isEncrypted && !message.isDecrypted
                    ? (
                        <Button
                          variant="ghost"
                          className="p-0 hover:bg-transparent"
                          onClick={() => message.encryptedContent && handleDecrypt(message.id, message.encryptedContent)}
                        >
                          🔒
                          {' '}
                          {message.content}
                        </Button>
                      )
                    : (
                        <>
                          {message.isEncrypted ? '🔓 ' : ''}
                          {message.content}
                        </>
                      )}
                </div>
                <div className={`mt-1 text-xs ${
                  message.isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}
                >
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="space-y-4 border-t p-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              onKeyPress={e => e.key === 'Enter' && sendMessage()}
            />
            <Select
              value={isEncrypted}
              onValueChange={(value: 'plain' | 'encrypted') =>
                setIsEncrypted(value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plain">Plain</SelectItem>
                <SelectItem value="encrypted">Encrypted</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={sendMessage}>
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
