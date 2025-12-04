
"use client";

import { Bell, LifeBuoy, LogOut, Moon, Settings, Sun, User } from "lucide-react";
import Link from "next/link";
import { doc } from "firebase/firestore";
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { getAvatarImage } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";

function UserProfileDisplay() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth(); // Call useAuth at the top level
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const isLoading = isUserLoading || (user && isProfileLoading && userProfile === undefined);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex flex-col items-end">
            <Skeleton className="h-5 w-24 mb-1" />
            <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    );
  }

  const userName = userProfile?.name || user?.email || 'User';
  const userRole = userProfile?.jobTitle || 'Role not set';
  const userInitial = userName.charAt(0).toUpperCase();
  const avatarImage = getAvatarImage(userName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 h-auto p-1 rounded-full focus-visible:ring-0">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none text-foreground">{userName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {userRole}
              </p>
            </div>
            <Avatar className="h-9 w-9">
              <AvatarImage src={avatarImage.imageUrl} alt={userName} data-ai-hint={avatarImage.imageHint} />
              <AvatarFallback>
                {userInitial}
              </AvatarFallback>
            </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-foreground">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userRole}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profil">
              <User className="mr-2 h-4 w-4" />
              <span>Profil</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/pengaturan">
              <Settings className="mr-2 h-4 w-4" />
              <span>Pengaturan</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LifeBuoy className="mr-2 h-4 w-4" />
          <span>Bantuan</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          API
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut(auth).then(() => window.location.href = '/login')}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


export function Header() {
  const { setTheme, theme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
      <SidebarTrigger className="hidden max-md:flex" />
      <div className="flex-1">
        <div className="relative inline-block">
          <h1 className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            ZENITHR Dashboard
          </h1>
           <div className="absolute -bottom-1 left-0 w-3/5 h-0.5 bg-gradient-to-r from-primary to-secondary rounded-full"></div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>
        <UserProfileDisplay />
      </div>
    </header>
  );
}
