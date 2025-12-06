
'use client';

import { useState, useEffect } from "react";
import { collection, doc, query, where, updateDoc } from "firebase/firestore";
import { Edit, User, Briefcase, MapPin, Loader2, KeyRound, PenSquare, UploadCloud } from "lucide-react";
import Image from 'next/image';
import { motion } from 'framer-motion';

import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import PageHeader from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EditProfileForm } from "@/components/profil/edit-profile-form";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarImage } from "@/lib/utils";
import { ChangePasswordForm } from "@/components/profil/change-password-form";
import { SignaturePad } from "@/components/pegawai/signature-pad";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';

const MotionCard = motion(Card);

function ProfilePageSkeleton() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-5 w-32" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-4">
                         <div className="flex items-center gap-3">
                            <Briefcase className="h-5 w-5 text-muted-foreground" />
                            <Skeleton className="h-5 w-1/3" />
                        </div>
                         <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-muted-foreground" />
                            <Skeleton className="h-5 w-1/2" />
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-10 w-36" />
                </CardContent>
            </Card>
        </div>

    );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | undefined }) {
  return (
    <div className="flex items-center gap-4">
      <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value || '-'}</p>
      </div>
    </div>
  );
}


export default function ProfilPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [isCoordinatorModalOpen, setIsCoordinatorModalOpen] = useState(false);
    const [coordinatorName, setCoordinatorName] = useState('');
    const [isSubmittingCoordinator, setIsSubmittingCoordinator] = useState(false);
    const [isCoordinatorSignatureModalOpen, setIsCoordinatorSignatureModalOpen] = useState(false);


    const userProfileRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const { data: userProfile, isLoading: isProfileLoading, refetch: refetchUserProfile } = useDoc<UserProfile>(userProfileRef);

    const isLoading = isUserLoading || isProfileLoading;
    
    const effectiveUserProfile = userProfile || (user ? {
        id: user.uid,
        email: user.email || '',
        name: user.displayName || 'Pengguna Baru',
        jobTitle: '',
        workArea: ''
    } : null);
    
    const handleCoordinatorNameChange = async () => {
        if (!user || !coordinatorName) return;
        setIsSubmittingCoordinator(true);
        try {
            const userRef = doc(firestore, 'users', user.uid);
            await updateDoc(userRef, {
                operationPointCoordinatorName: coordinatorName,
            });
            toast.success("Koordinator Diperbarui", {
                description: "Nama atasan langsung telah berhasil disimpan.",
            });
            refetchUserProfile();
            setIsCoordinatorModalOpen(false);
        } catch (error) {
            console.error("Failed to update coordinator name:", error);
            toast.error("Gagal Menyimpan", {
                description: "Terjadi kesalahan saat memperbarui nama koordinator.",
            });
        } finally {
            setIsSubmittingCoordinator(false);
        }
    };


    const avatarImage = effectiveUserProfile ? getAvatarImage(effectiveUserProfile.name) : { imageUrl: '', imageHint: '' };
    const userInitial = effectiveUserProfile?.name.charAt(0).toUpperCase() || '?';

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                duration: 0.5,
                ease: 'easeOut',
            },
        },
    };

    return (
        <motion.div 
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
            <PageHeader
                title="Profil Saya"
                description="Kelola informasi pribadi dan pengaturan akun Anda."
            />
            {isLoading || !effectiveUserProfile ? (
                <ProfilePageSkeleton />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <MotionCard variants={itemVariants}>
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <Avatar className="h-24 w-24 border-4">
                                <AvatarImage src={avatarImage.imageUrl} alt={effectiveUserProfile.name} data-ai-hint={avatarImage.imageHint} />
                                <AvatarFallback>
                                    {userInitial}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-grow text-center sm:text-left">
                                <CardTitle className="text-3xl">{effectiveUserProfile.name}</CardTitle>
                                <CardDescription className="mt-1">{effectiveUserProfile.email}</CardDescription>
                            </div>
                            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="w-full sm:w-auto">
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Profil
                                    </Button>
                                </DialogTrigger>
                                {effectiveUserProfile && (
                                    <DialogContent className="sm:max-w-[600px] max-h-[90dvh] flex flex-col">
                                        <DialogHeader>
                                            <DialogTitle>Edit Profil</DialogTitle>
                                            <DialogDescription>
                                                Perbarui nama, jabatan, dan area kerja Anda.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <EditProfileForm 
                                            userProfile={effectiveUserProfile} 
                                            userId={user!.uid} 
                                            setModalOpen={setIsEditModalOpen} 
                                        />
                                    </DialogContent>
                                )}
                            </Dialog>
                        </CardHeader>
                        <CardContent className="grid gap-6 pt-6 md:grid-cols-2">
                            <InfoRow icon={Briefcase} label="Jabatan" value={effectiveUserProfile.jobTitle} />
                            <InfoRow icon={MapPin} label="Area Kerja" value={effectiveUserProfile.workArea} />
                        </CardContent>
                    </MotionCard>
                    <MotionCard variants={itemVariants}>
                        <CardHeader>
                            <CardTitle>Keamanan Akun</CardTitle>
                            <CardDescription>Ubah password Anda secara berkala untuk menjaga keamanan akun.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Dialog open={isChangePasswordModalOpen} onOpenChange={setChangePasswordModalOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <KeyRound className="mr-2 h-4 w-4" />
                                        Ubah Password
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[450px]">
                                    <DialogHeader>
                                        <DialogTitle>Ubah Password</DialogTitle>
                                        <DialogDescription>
                                            Masukkan password Anda saat ini dan password baru.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <ChangePasswordForm setModalOpen={setChangePasswordModalOpen} />
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </MotionCard>
                  </div>
                  <div className="space-y-6">
                    <MotionCard variants={itemVariants}>
                        <CardHeader>
                            <CardTitle>Tanda Tangan Digital</CardTitle>
                            <CardDescription>Tanda tangan ini akan digunakan pada dokumen yang Anda buat.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {effectiveUserProfile.signatureUrl ? (
                                <div className="space-y-4">
                                    <div className="border rounded-md p-2 bg-muted/50 flex justify-center items-center">
                                        <Image src={effectiveUserProfile.signatureUrl} alt="Tanda tangan" width={200} height={100} className="object-contain" />
                                    </div>
                                     <Button variant="outline" className="w-full" onClick={() => setIsSignatureModalOpen(true)}>Ganti Tanda Tangan</Button>
                                </div>
                            ) : (
                                <Button className="w-full" onClick={() => setIsSignatureModalOpen(true)}>
                                    <PenSquare className="mr-2 h-4 w-4"/>
                                    Upload Tanda Tangan
                                </Button>
                            )}
                        </CardContent>
                    </MotionCard>
                    
                    {effectiveUserProfile.jobTitle === 'Field Coordinator' && (
                        <MotionCard variants={itemVariants}>
                             <CardHeader>
                                <CardTitle>Atasan Langsung (O.P.C)</CardTitle>
                                <CardDescription>Kelola nama dan tanda tangan Operation Point Coordinator.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Nama Koordinator</Label>
                                    <p className="font-medium">{userProfile?.operationPointCoordinatorName || 'Belum diatur'}</p>
                                </div>
                                 <Button variant="outline" className="w-full" onClick={() => {
                                        setCoordinatorName(userProfile?.operationPointCoordinatorName || '');
                                        setIsCoordinatorModalOpen(true);
                                    }}>Ganti Nama Koordinator</Button>
                                
                                <div className="pt-2">
                                     <Label className="text-xs text-muted-foreground">Tanda Tangan Koordinator</Label>
                                      {userProfile?.operationPointCoordinatorSignatureUrl ? (
                                         <div className="space-y-2 mt-1">
                                            <div className="border rounded-md p-2 bg-muted/50 flex justify-center items-center">
                                                <Image src={userProfile.operationPointCoordinatorSignatureUrl} alt="TTD Koordinator" width={200} height={100} className="object-contain" />
                                            </div>
                                             <Button variant="outline" className="w-full" onClick={() => setIsCoordinatorSignatureModalOpen(true)}>Ganti TTD Koordinator</Button>
                                        </div>
                                    ) : (
                                        <Button className="w-full mt-1" onClick={() => setIsCoordinatorSignatureModalOpen(true)}>
                                            <UploadCloud className="mr-2 h-4 w-4"/>
                                            Upload TTD Koordinator
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </MotionCard>
                    )}
                  </div>
                </div>
            )}
             {/* Signature Modal (Self) */}
            <Dialog open={isSignatureModalOpen} onOpenChange={setIsSignatureModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload Tanda Tangan Anda</DialogTitle>
                    </DialogHeader>
                    {user && (
                        <SignaturePad 
                            docId={user.uid}
                            collectionPath="users"
                            fieldToUpdate="signatureUrl"
                            onSignatureUploaded={() => {
                                refetchUserProfile();
                                setIsSignatureModalOpen(false);
                            }} 
                        />
                    )}
                </DialogContent>
            </Dialog>
            
            {/* Signature Modal (Coordinator) */}
            <Dialog open={isCoordinatorSignatureModalOpen} onOpenChange={setIsCoordinatorSignatureModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload Tanda Tangan Koordinator</DialogTitle>
                    </DialogHeader>
                    {user && (
                        <SignaturePad 
                            docId={user.uid}
                            collectionPath="users"
                            fieldToUpdate="operationPointCoordinatorSignatureUrl"
                            onSignatureUploaded={() => {
                                refetchUserProfile();
                                setIsCoordinatorSignatureModalOpen(false);
                            }} 
                        />
                    )}
                </DialogContent>
            </Dialog>

             {/* Coordinator Name Modal */}
            <Dialog open={isCoordinatorModalOpen} onOpenChange={setIsCoordinatorModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ganti Nama Atasan Langsung</DialogTitle>
                        <DialogDescription>Ketik nama Operation Point Coordinator Anda.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="coordinator-name" className="text-right">
                                Nama
                            </Label>
                            <Input
                                id="coordinator-name"
                                value={coordinatorName}
                                onChange={(e) => setCoordinatorName(e.target.value)}
                                className="col-span-3"
                                placeholder="Nama lengkap koordinator"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCoordinatorModalOpen(false)}>Batal</Button>
                        <Button onClick={handleCoordinatorNameChange} disabled={isSubmittingCoordinator || !coordinatorName}>
                            {isSubmittingCoordinator && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}

    