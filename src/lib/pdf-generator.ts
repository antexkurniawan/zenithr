
'use client';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import React, { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

export const generatePdfFromComponent = async (
    component: React.ReactNode,
    fileName: string
): Promise<void> => {
    // We need to render the component to the DOM to capture it, but off-screen.
    const container = document.createElement('div');
    container.id = 'pdf-render-container';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    // Set a reasonable width for the container to render into.
    container.style.width = '210mm';
    document.body.appendChild(container);

    // Use ReactDOM.createRoot for React 18+
    const root = createRoot(container);
    root.render(component as ReactElement);

    // Allow time for component to render fully, especially with images
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get all pages to print from within the rendered container
    const pages = container.querySelectorAll<HTMLElement>('[data-printable-page="true"]');
    
    if (pages.length === 0) {
        console.error("Could not find any elements with 'data-printable-page' attribute to generate PDF.");
        document.body.removeChild(container);
        root.unmount();
        return;
    }

    try {
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
        });

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const canvas = await html2canvas(page, {
                scale: 3, // Higher scale for better quality
                useCORS: true,
                logging: false,
                width: page.offsetWidth,
                height: page.offsetHeight,
                windowWidth: page.scrollWidth,
                windowHeight: page.scrollHeight,
            });

            // Use JPEG for better compression
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            
            const pdfWidth = 210;
            const pdfHeight = 297;
            
            if (i > 0) {
                pdf.addPage();
            }
            
            // Add image to fill the page, maintaining aspect ratio
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }
        
        // Open PDF in a new tab
        const pdfBlob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');
        URL.revokeObjectURL(pdfUrl);

    } catch (error) {
        console.error("Error generating PDF:", error);
        throw error;
    } finally {
        // Cleanup: remove the container from the DOM
        document.body.removeChild(container);
        root.unmount();
    }
};
