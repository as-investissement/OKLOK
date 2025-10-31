import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface AdminPDFData {
  employeeName: string;
  firstName: string;
  lastName: string;
  companyName: string;
  month: string;
  year: number;
  entries: Array<{
    date: string;
    projects: Array<{
      name: string;
      normalHours: number;
      overtimeHours: number;
    }>;
  }>;
}

export const generateAdminTimesheetPDF = (data: AdminPDFData): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Configuration des polices et tailles
  const titleSize = 18;
  const headerSize = 14;
  const normalSize = 10;
  const smallSize = 8;
  
  let yPosition = 20;
  
  // EN-TÊTE avec les informations demandées
  doc.setFontSize(titleSize);
  doc.setFont('helvetica', 'bold');
  doc.text('FEUILLE DE TEMPS', 105, yPosition, { align: 'center' });
  
  yPosition += 10;
  
  // Informations personnelles sur 2 lignes
  doc.setFontSize(headerSize);
  doc.setFont('helvetica', 'normal');
  
  // Ligne 1: NOM et Prénom
  doc.text(`NOM: ${data.lastName}`, 20, yPosition);
  doc.text(`Prénom: ${data.firstName}`, 110, yPosition);
  
  yPosition += 8;
  
  // Ligne 2: Entreprise et Mois
  doc.text(`Entreprise: ${data.companyName}`, 20, yPosition);
  const monthName = format(new Date(data.year, parseInt(data.month.split('-')[1]) - 1), 'MMMM yyyy', { locale: fr });
  doc.text(`Mois: ${monthName}`, 110, yPosition);
  
  // Ligne de séparation
  yPosition += 10;
  doc.setLineWidth(0.5);
  doc.line(20, yPosition, 190, yPosition);
  
  // En-tête du tableau
  yPosition += 10;
  doc.setFillColor(220, 220, 220);
  doc.rect(20, yPosition - 5, 170, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(normalSize);
  
  doc.text('Date', 25, yPosition, { align: 'left' });
  doc.text('Chantier(s)', 70, yPosition, { align: 'left' });
  doc.text('H. Normales', 140, yPosition, { align: 'center' });
  doc.text('H. Supp.', 170, yPosition, { align: 'center' });
  
  // Lignes du tableau
  yPosition += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(smallSize);
  
  let totalNormalHours = 0;
  let totalOvertimeHours = 0;
  
  // Générer toutes les dates du mois
  const year = data.year;
  const month = parseInt(data.month.split('-')[1]);
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateString = date.toISOString().split('T')[0];
    const dayName = format(date, 'EEEE d MMMM yyyy', { locale: fr });
    
    // Trouver les entrées pour cette date
    const dayEntry = data.entries.find(entry => entry.date === dateString);
    
    // Alterner les couleurs de fond
    if (day % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(20, yPosition - 3, 170, 6, 'F');
    }
    
    if (dayEntry && dayEntry.projects.length > 0) {
      // Jour avec des heures
      const dayNormalHours = dayEntry.projects.reduce((sum, proj) => sum + proj.normalHours, 0);
      const dayOvertimeHours = dayEntry.projects.reduce((sum, proj) => sum + proj.overtimeHours, 0);
      
      totalNormalHours += dayNormalHours;
      totalOvertimeHours += dayOvertimeHours;
      
      // Date
      doc.text(dayName, 25, yPosition);
      
      // Chantiers - Si plusieurs, les mettre l'un en dessous de l'autre
      if (dayEntry.projects.length === 1) {
        // Un seul chantier
        doc.text(dayEntry.projects[0].name, 70, yPosition);
      } else {
        // Plusieurs chantiers - les empiler verticalement
        dayEntry.projects.forEach((project, index) => {
          doc.text(project.name, 70, yPosition + (index * 3));
        });
      }
      
      // Heures
      doc.text(dayNormalHours > 0 ? `${dayNormalHours}h` : '-', 140, yPosition, { align: 'center' });
      doc.text(dayOvertimeHours > 0 ? `${dayOvertimeHours}h` : '-', 170, yPosition, { align: 'center' });
      
      // Ajuster l'espacement si plusieurs chantiers
      if (dayEntry.projects.length > 1) {
        yPosition += (dayEntry.projects.length - 1) * 3;
      }
    } else {
      // Jour sans heures
      doc.text(dayName, 25, yPosition);
      doc.text('Non travaillé', 70, yPosition);
      doc.text('-', 140, yPosition, { align: 'center' });
      doc.text('-', 170, yPosition, { align: 'center' });
    }
    
    yPosition += 6;
    
    // Nouvelle page si nécessaire
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }
  }
  
  // Ligne de séparation finale
  yPosition += 5;
  doc.setLineWidth(0.5);
  doc.line(20, yPosition, 190, yPosition);
  
  // TOTAUX EN BAS
  yPosition += 10;
  doc.setFontSize(headerSize);
  doc.setFont('helvetica', 'bold');
  
  doc.text(`Total heures normales: ${totalNormalHours}h`, 25, yPosition);
  yPosition += 8;
  doc.text(`Total heures supplémentaires: ${totalOvertimeHours}h`, 25, yPosition);
  yPosition += 8;
  doc.text(`TOTAL GÉNÉRAL: ${totalNormalHours + totalOvertimeHours}h`, 25, yPosition);
  
  return doc;
};

export const downloadAdminPDF = (data: AdminPDFData) => {
  const doc = generateAdminTimesheetPDF(data);
  const monthName = format(new Date(data.year, parseInt(data.month.split('-')[1]) - 1), 'MMMM-yyyy', { locale: fr });
  const fileName = `feuille-temps-${data.lastName}-${data.firstName}-${monthName}.pdf`;
  doc.save(fileName);
};

export const generateAdminPDFBlob = (data: AdminPDFData): Blob => {
  const doc = generateAdminTimesheetPDF(data);
  return doc.output('blob');
};