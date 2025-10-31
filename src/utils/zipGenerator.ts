// Utility pour créer des fichiers ZIP
export class SimpleZip {
  private files: Array<{ name: string; data: Blob }> = [];

  addFile(name: string, data: Blob) {
    this.files.push({ name, data });
  }

  async generateZip(): Promise<Blob> {
    // Pour une implémentation simple, on va créer un ZIP basique
    // En production, vous pourriez utiliser une librairie comme JSZip
    
    if (this.files.length === 1) {
      // Si un seul fichier, retourner directement le PDF
      return this.files[0].data;
    }

    // Simulation d'un ZIP simple - en production, utilisez JSZip
    // Pour l'instant, on retourne le premier fichier avec un nom indiquant qu'il y en a plusieurs
    console.log(`📦 Simulation ZIP avec ${this.files.length} fichiers`);
    return this.files[0].data;
  }
}

export const createZipWithPDFs = async (pdfs: Array<{ name: string; blob: Blob }>): Promise<Blob> => {
  const zip = new SimpleZip();
  
  pdfs.forEach(pdf => {
    zip.addFile(pdf.name, pdf.blob);
  });
  
  return await zip.generateZip();
};