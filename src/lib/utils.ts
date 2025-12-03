import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a unique, consistent avatar illustration URL for a given name.
 * Uses the DiceBear API to create an SVG illustration.
 * @param name The name to generate an avatar for.
 * @returns An object containing the illustration URL and an image hint.
 */
export function getAvatarImage(name: string): { imageUrl: string, imageHint: string } {
  const seed = encodeURIComponent(name);
  // Using the "bottts-neutral" style for a friendly, modern, and neutral look.
  const imageUrl = `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${seed}`;
  
  return { 
    imageUrl, 
    imageHint: "illustration avatar" // Generic hint for AI purposes
  };
}
