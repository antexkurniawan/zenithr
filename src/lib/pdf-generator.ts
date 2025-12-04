
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
    container.style.width = '210mm'; // A4 paper width
    document.body.appendChild(container);

    // Use ReactDOM.createRoot for React 18+
    const root = createRoot(container);
    root.render(component as ReactElement);

    // Allow time for component to render fully
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
            });

            // Change to JPEG format with 90% quality for compression
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            
            const pdfWidth = 210;
            const pdfHeight = 297;
            
            const imgProps = pdf.getImageProperties(imgData);
            const ratio = imgProps.width / imgProps.height;
            
            let finalImgWidth = pdfWidth;
            let finalImgHeight = finalImgWidth / ratio;
            
            if (finalImgHeight > pdfHeight) {
                finalImgHeight = pdfHeight;
                finalImgWidth = finalImgHeight * ratio;
            }
            
            if (i > 0) {
                pdf.addPage();
            }
            
            const x = (pdfWidth - finalImgWidth) / 2;
            const y = (pdfHeight - finalImgHeight) / 2;

            pdf.addImage(imgData, 'JPEG', x, y, finalImgWidth, finalImgHeight);
        }
        
        const pdfBlob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');
        URL.revokeObjectURL(pdfUrl);

    } catch (error) {
        console.error("Error generating PDF:", error);
        throw error;
    } finally {
        document.body.removeChild(container);
        root.unmount();
    }
};
