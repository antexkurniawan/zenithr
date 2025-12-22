
'use client';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Generates a PDF from a React component and opens it in a new tab.
 * @param component The React component to render into the PDF.
 */
export const generatePdfFromComponent = async (component: React.ReactElement): Promise<void> => {
    
    // Create a temporary container to render the component off-screen
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px'; // Position it off-screen
    container.style.width = '210mm'; // A4 width
    document.body.appendChild(container);

    // Dynamically import ReactDOM to render the component
    const { createRoot } = await import('react-dom/client');
    const root = createRoot(container);
    root.render(component);

    // Allow time for the component to render, especially if it has images
    await new Promise(resolve => setTimeout(resolve, 500));

    const pages = container.querySelectorAll('[data-printable-page="true"]');
    if (pages.length === 0) {
        console.error("No printable pages found in the component.");
        document.body.removeChild(container);
        root.unmount();
        return;
    }
    
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const canvas = await html2canvas(page, {
            scale: 2, // Increase scale for better quality
            useCORS: true,
            logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        if (i > 0) {
            pdf.addPage();
        }
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    }
    
    // Create a Blob from the PDF and open it in a new tab
    const pdfBlob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl);
    URL.revokeObjectURL(blobUrl); // Clean up the URL object

    // Clean up the temporary container
    document.body.removeChild(container);
    root.unmount();
};
