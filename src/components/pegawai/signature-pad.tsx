
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, UploadCloud } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';

import { useFirestore } from '@/firebase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { DialogHeader, DialogTitle } from '../ui/dialog';

const formSchema = z.object({
  signatureFile: z
    .custom<FileList>()
    .refine(files => files?.length === 1, 'File tanda tangan harus diisi.')
    .refine(files => files?.[0]?.type.startsWith('image/'), 'File harus berupa gambar.'),
});

type SignatureFormValues = z.infer<typeof formSchema>;

interface SignaturePadProps {
  docId: string;
  collectionPath: 'employees' | 'users';
  fieldToUpdate?: string; // New optional prop
  onSignatureUploaded: (newUrl: string) => void;
}

export function SignaturePad({ docId, collectionPath, fieldToUpdate = 'signatureUrl', onSignatureUploaded }: SignaturePadProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  
  const firestore = useFirestore();

  const form = useForm<SignatureFormValues>({
    resolver: zodResolver(formSchema),
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  async function onSubmit(data: SignatureFormValues) {
    setIsSubmitting(true);
    if (!preview) {
      toast.error('Tidak ada gambar', {
        description: 'Silakan pilih file gambar untuk diunggah.',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const docRef = doc(firestore, collectionPath, docId);
      await updateDoc(docRef, {
        [fieldToUpdate]: preview,
      });
      
      toast.success('Tanda Tangan Berhasil Disimpan!', {
        description: `Tanda tangan telah diperbarui.`,
      });
      onSignatureUploaded(preview);

    } catch (error) {
      console.error('Error handling signature:', error);
      toast.error('Gagal Memproses Tanda Tangan', {
        description: 'Terjadi kesalahan saat memproses tanda tangan.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
    <DialogHeader>
        <DialogTitle>Upload Tanda Tangan</DialogTitle>
    </DialogHeader>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="signatureFile"
          render={({ field }) => (
            <FormItem>
              <FormLabel>File Gambar Tanda Tangan</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    field.onChange(e.target.files);
                    handleFileChange(e);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {preview && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Preview Tanda Tangan</p>
            <div className="border rounded-md p-4 flex justify-center items-center bg-muted/30">
              <Image src={preview} alt="Preview tanda tangan" width={250} height={125} className="object-contain" />
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting || !preview}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="mr-2 h-4 w-4" />
            )}
            Simpan Tanda Tangan
          </Button>
        </div>
      </form>
    </Form>
    </>
  );
}
