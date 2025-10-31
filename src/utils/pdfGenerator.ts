import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface PDFData {
  employeeName: string;
  companyName: string;
  month: string;
  year: number;
  totalHours: number;
  normalHours: number;
  overtimeHours: number;
  absenceHours: number;
  workingDays: number;
  leaveDays: number;
  entries: Array<{
    date: string;
    project: string;
    normalHours: number;
    overtimeHours: number;
    absenceHours: number;
  }>;
}

export const generateTimesheetPDF = (data: PDFData): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Configuration des polices et tailles
  const titleSize = 16;
  const headerSize = 12;
  const normalSize = 10;
  const smallSize = 8;
  
  // Réduire les marges - commencer plus haut
  let yPosition = 12;
  
  // En-tête principal
  doc.setFontSize(titleSize);
  doc.setFont('helvetica', 'bold');
  doc.text('FEUILLE D\'HEURES', 105, yPosition, { align: 'center' });
  
  yPosition += 5;
  doc.setFontSize(headerSize);
  doc.setFont('helvetica', 'normal');
  // Utiliser le nom de l'entreprise du salarié au lieu de "AS INVESTISSEMENT"
  const companyName = data.companyName || 'AS INVESTISSEMENT';
  doc.text(companyName, 105, yPosition, { align: 'center' });
  
  yPosition += 4;
  doc.setFontSize(normalSize);
  const monthName = format(new Date(data.year, parseInt(data.month.split('-')[1]) - 1), 'MMMM yyyy', { locale: fr });
  doc.text(`Période: ${monthName}`, 105, yPosition, { align: 'center' });
  
  // Ligne de séparation
  yPosition += 6;
  // Réduire les marges latérales de 20mm à 10mm
  doc.setLineWidth(0.5);
  doc.line(10, yPosition, 200, yPosition);
  
  // Nom et prénom directement après la ligne
  yPosition += 8;
  doc.setFontSize(normalSize);
  doc.setFont('helvetica', 'normal');
  
  // Séparer le nom complet en prénom et nom
  const nameParts = data.employeeName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  // Colonnes pour les informations
  doc.text('Nom:', 10, yPosition);
  doc.text(lastName, 40, yPosition);
  doc.text('Prénom:', 110, yPosition);
  doc.text(firstName, 140, yPosition);
  
  // Récapitulatif
  yPosition += 8;
  doc.setFillColor(240, 240, 240);
  // Étendre le rectangle sur toute la largeur avec marges réduites
  doc.rect(10, yPosition - 5, 190, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text(`Récapitulatif: ${Math.floor(data.normalHours)}h normales | ${Math.floor(data.overtimeHours)}h sup | ${Math.floor(data.absenceHours)}h abs | ${data.leaveDays}j congés | Total: ${Math.floor(data.totalHours)}h`, 105, yPosition, { align: 'center' });
  
  // Tableau des heures
  yPosition += 12;
  
  // En-tête du tableau
  doc.setFillColor(220, 220, 220);
  // Étendre le tableau sur toute la largeur avec marges réduites
  doc.rect(10, yPosition - 5, 190, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(smallSize);
  
  // Repositionner les colonnes avec plus d'espace
  doc.text('Date', 30, yPosition, { align: 'center' });
  doc.text('Nom du chantier', 95, yPosition, { align: 'center' });
  doc.text('H. Norm.', 145, yPosition, { align: 'center' });
  doc.text('H. Supp.', 165, yPosition, { align: 'center' });
  doc.text('H. Abs.', 185, yPosition, { align: 'center' });
  
  // Lignes du tableau
  yPosition += 10;
  doc.setFont('helvetica', 'normal');
  
  // Grouper les entrées par date
  const entriesByDate: { [key: string]: typeof data.entries } = {};
  data.entries.forEach(entry => {
    if (!entriesByDate[entry.date]) {
      entriesByDate[entry.date] = [];
    }
    entriesByDate[entry.date].push(entry);
  });
  
  // Générer toutes les dates du mois
  const year = data.year;
  const month = parseInt(data.month.split('-')[1]);
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateString = date.toISOString().split('T')[0];
    const dayName = format(date, 'EEEE d MMMM yyyy', { locale: fr });

    const dayEntries = entriesByDate[dateString] || [];

    if (dayEntries.length > 0) {
      // Jour avec des heures - afficher chaque chantier sur une ligne séparée
      dayEntries.forEach((entry, index) => {
        // Alterner les couleurs de fond pour chaque ligne
        if (day % 2 === 0) {
          doc.setFillColor(248, 248, 248);
          doc.rect(10, yPosition - 3, 190, 6, 'F');
        }

        // Afficher la date seulement sur la première ligne du jour
        if (index === 0) {
          doc.text(dayName, 15, yPosition);
        }

        // Afficher le nom du chantier
        const projectName = entry.project.length > 35 ? entry.project.substring(0, 35) + '...' : entry.project;
        doc.text(projectName, 95, yPosition, { align: 'center' });

        // Afficher les heures normales, supplémentaires et d'absence pour ce chantier
        doc.text(entry.normalHours > 0 ? `${entry.normalHours}h` : '-', 145, yPosition, { align: 'center' });
        doc.text(entry.overtimeHours > 0 ? `${entry.overtimeHours}h` : '-', 165, yPosition, { align: 'center' });
        doc.text(entry.absenceHours > 0 ? `${entry.absenceHours}h` : '-', 185, yPosition, { align: 'center' });

        yPosition += 6;

        // Nouvelle page si nécessaire
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
      });
    } else {
      // Jour sans heures
      // Alterner les couleurs de fond
      if (day % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(10, yPosition - 3, 190, 6, 'F');
      }

      doc.text(dayName, 15, yPosition);
      doc.text('Non enregistré', 105, yPosition, { align: 'center' });
      doc.text('-', 155, yPosition, { align: 'center' });
      doc.text('-', 185, yPosition, { align: 'center' });

      yPosition += 6;

      // Nouvelle page si nécessaire
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
    }
  }
  
  // Ligne de séparation finale
  yPosition += 5;
  doc.setLineWidth(0.5);
  doc.line(10, yPosition, 200, yPosition);
  
  // Pied de page
  yPosition += 10;
  doc.setFontSize(smallSize);
  doc.setFont('helvetica', 'normal');
  const generatedAt = format(new Date(), 'dd/MM/yyyy \'à\' HH:mm:ss', { locale: fr });
  doc.text(`Document généré le ${generatedAt}`, 105, yPosition, { align: 'center' });
  
  return doc;
};

export const downloadPDF = async (data: PDFData) => {
  const doc = generateTimesheetPDF(data);
  const monthName = format(new Date(data.year, parseInt(data.month.split('-')[1]) - 1), 'MMMM-yyyy', { locale: fr });
  const fileName = `feuille-temps-${data.employeeName.replace(/\s+/g, '-')}-${monthName}.pdf`;

  // Vérifier si on est sur mobile (Capacitor)
  const isCapacitor = (window as any).Capacitor !== undefined;

  if (isCapacitor) {
    // Sur mobile avec Capacitor, utiliser l'API de partage
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');

      // Convertir le PDF en base64
      const pdfOutput = doc.output('datauristring');
      const base64Data = pdfOutput.split(',')[1];

      // Sauvegarder le fichier temporairement
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache
      });

      // Partager le fichier
      await Share.share({
        title: 'Feuille de temps',
        text: `Feuille de temps - ${monthName}`,
        url: result.uri,
        dialogTitle: 'Partager la feuille de temps'
      });
    } catch (error) {
      console.error('Erreur lors du partage mobile:', error);
      // Fallback sur la méthode classique
      fallbackDownload(doc, fileName);
    }
  } else {
    // Sur web, utiliser la méthode avec lien <a>
    fallbackDownload(doc, fileName);
  }
};

// Fonction de fallback pour le téléchargement
const fallbackDownload = (doc: jsPDF, fileName: string) => {
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Nettoyer
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
};

export const previewPDF = async (data: PDFData) => {
  const doc = generateTimesheetPDF(data);
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);

  // Vérifier si on est sur mobile (Capacitor)
  const isCapacitor = (window as any).Capacitor !== undefined;

  if (isCapacitor) {
    // Sur mobile, essayer d'ouvrir avec le navigateur système
    try {
      const { Browser } = await import('@capacitor/browser');

      // Convertir le blob en data URL pour l'ouvrir
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        await Browser.open({ url: dataUrl });
      };
      reader.readAsDataURL(pdfBlob);
    } catch (error) {
      console.error('Erreur lors de l\'aperçu mobile:', error);
      // Fallback : télécharger directement
      const monthName = format(new Date(data.year, parseInt(data.month.split('-')[1]) - 1), 'MMMM-yyyy', { locale: fr });
      const fileName = `feuille-temps-${data.employeeName.replace(/\s+/g, '-')}-${monthName}.pdf`;
      fallbackDownload(doc, fileName);
    }
  } else {
    // Sur web, ouvrir dans un nouvel onglet
    const newWindow = window.open(pdfUrl, '_blank');

    if (!newWindow) {
      // Si le popup est bloqué, télécharger à la place
      alert('Le bloqueur de popups a empêché l\'ouverture. Le PDF va être téléchargé.');
      const monthName = format(new Date(data.year, parseInt(data.month.split('-')[1]) - 1), 'MMMM-yyyy', { locale: fr });
      const fileName = `feuille-temps-${data.employeeName.replace(/\s+/g, '-')}-${monthName}.pdf`;
      fallbackDownload(doc, fileName);
    }

    // Nettoyer l'URL après un délai
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 10000);
  }
};