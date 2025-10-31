import { addDays, startOfWeek, endOfWeek, isAfter, isBefore, isToday, isSunday, getWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

// Fonction pour valider si une chaîne est un UUID valide
export const isValidUUID = (str: string): boolean => {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// UUID par défaut pour les cas où companyId n'est pas défini
const DEFAULT_COMPANY_ID = '550e8400-e29b-41d4-a716-446655440011';

// Fonction pour s'assurer qu'on a un UUID valide
export const ensureValidUUID = (companyId: string | number | undefined | null): string => {
  // Convert to string first to handle both string and number inputs
  const idAsString = String(companyId || '').trim();
  
  // If the string is empty, null, undefined, or not a valid UUID, use default
  if (!idAsString || !isValidUUID(idAsString)) {
    console.log('⚠️ Company ID invalide détecté:', companyId, '- utilisation du défaut:', DEFAULT_COMPANY_ID);
    return DEFAULT_COMPANY_ID;
  }
  
  return idAsString;
};

// Générer un ID UUID valide
export const generateId = (): string => {
  try {
    return crypto.randomUUID();
  } catch (error) {
    // Fallback si crypto.randomUUID() n'est pas disponible
    console.warn('crypto.randomUUID() non disponible, génération manuelle');
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

// Formater une date en format local
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

// Formater une date courte (jour mois)
export const formatDateShort = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long'
  });
};

// Obtenir le numéro de semaine et formater l'affichage
export const formatWeekDisplay = (weekStarting: string, weekEnding: string): string => {
  const startDate = new Date(weekStarting);
  const weekNumber = getWeek(startDate, { weekStartsOn: 1 });
  const year = startDate.getFullYear();
  
  const startFormatted = formatDateShort(weekStarting);
  const endFormatted = formatDateShort(weekEnding);
  
  return `Semaine ${weekNumber} : du ${startFormatted} au ${endFormatted} ${year}`;
};

// Formater l'heure (HH:MM) pour l'affichage
export const getWeekRange = (dateString: string): { start: string, end: string } => {
  const date = new Date(dateString + 'T12:00:00'); // Use local time instead of UTC
  const start = startOfWeek(date, { weekStartsOn: 1, locale: fr }); // Lundi = début
  const end = endOfWeek(date, { weekStartsOn: 1, locale: fr }); // Dimanche = fin
  
  // Format dates using local methods to ensure consistent 7-day period
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return {
    start: formatDateLocal(start),
    end: formatDateLocal(end)
  };
};

// Formater un nombre d'heures pour l'affichage
export const formatHours = (hours: number): string => {
  return `${hours.toFixed(1)} heures`;
};

// Obtenir la plage de dates de la semaine en cours
export const getCurrentWeekRange = (dateString?: string): { start: string, end: string } => {
  // Utiliser getWeekRange pour s'assurer que la semaine commence le lundi
  return getWeekRange(dateString || new Date().toISOString());
};

// Vérifier si l'enregistrement des heures est autorisé
export const canRecordHours = (dateString: string): boolean => {
  const now = new Date();
  const date = new Date(dateString);
  
  // Obtenir la semaine en cours française (lundi à dimanche)
  const currentWeekStart = new Date(now);
  // Calculer le lundi de cette semaine (système français)
  const dayOfWeek = now.getDay(); // 0=dimanche, 1=lundi, 6=samedi
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Si dimanche, c'est 6 jours depuis lundi
  currentWeekStart.setDate(now.getDate() - daysFromMonday);
  currentWeekStart.setHours(0, 0, 0, 0);
  
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Dimanche = lundi + 6 jours
  currentWeekEnd.setHours(23, 59, 59, 999);
  
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  targetDate.setHours(0, 0, 0, 0);
  
  // Si la date est dans la semaine en cours
  if (targetDate >= currentWeekStart && targetDate <= currentWeekEnd) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0);

    // Pour le jour en cours, autoriser l'enregistrement seulement après 18h
    if (targetDate.getTime() === today.getTime()) {
      return now.getHours() >= 17;
    }

    // Pour les jours passés de la semaine en cours, autoriser l'enregistrement
    if (targetDate < today) {
      return true;
    }
    
    // Pour les jours futurs de la semaine en cours, autoriser l'enregistrement
    if (targetDate > today) {
      return true;
    }
  }

  // Pour les semaines passées (après dimanche 23h59), ne pas autoriser car déjà soumises automatiquement
  // Pour les semaines futures, ne pas autoriser
  return false;
};

// Vérifier si c'est après la date d'approbation automatique (15 du mois suivant à 23h59)
const isAfterAutoApprovalDate = (date: string): boolean => {
  const dayDate = new Date(date);
  const now = new Date();

  // Calculer le 15 du mois suivant à 23h59 (pas 00h00 !)
  const autoApprovalDate = new Date(dayDate.getFullYear(), dayDate.getMonth() + 1, 15, 23, 59, 59);

  return now > autoApprovalDate;
};

// Traduire automatiquement les anciens noms anglais en français
export const translateLeaveType = (text: string): string => {
  if (!text) return text;

  const upper = text.toUpperCase();

  // Traductions des congés (anglais)
  if (upper.includes('PAID') && upper.includes('LEAVE')) return 'Congés payés';
  if (upper === 'PAID_LEAVE') return 'Congés payés';
  if (upper.includes('LEAVE')) return 'Congés';

  // Traductions des types de congés (snake_case vers français)
  if (upper === 'CONGE_ANNUEL') return 'Congé annuel';
  if (upper === 'RTT') return 'RTT';
  if (upper === 'CONGE_MALADIE') return 'Congé maladie';
  if (upper === 'CONGE_MATERNITE') return 'Congé maternité';
  if (upper === 'CONGE_PATERNITE') return 'Congé paternité';

  // Traductions des absences (anglais)
  if (upper.includes('ABSENT')) return 'Absence';
  if (upper.includes('ABSENCE')) return 'Absence';

  // Traductions des types d'absence (snake_case vers français)
  if (upper === 'ABSENCE_JUSTIFIEE') return 'Absence justifiée';
  if (upper === 'ABSENCE_INJUSTIFIEE') return 'Absence injustifiée';
  if (upper === 'RETARD') return 'Retard';

  // Si déjà en français, retourner tel quel
  return text;
};

// Obtenir le nom d'affichage correct pour une entrée (congé/absence/projet)
export const getEntryDisplayName = (entry: any, findProjectById?: (id: string | null) => any): string => {
  if (entry.isPaidLeave) {
    // Priorité 1: leaveType (traduire si anglais)
    if (entry.leaveType) return translateLeaveType(entry.leaveType);
    // Priorité 2: project (traduire si anglais)
    if (entry.project) return translateLeaveType(entry.project);
    return 'Congés payés';
  }

  if (entry.isAbsence) {
    // Priorité 1: leaveType (traduire si anglais)
    if (entry.leaveType) return translateLeaveType(entry.leaveType);
    // Priorité 2: project (traduire si anglais)
    if (entry.project) return translateLeaveType(entry.project);
    return 'Absence';
  }

  // Pour les projets normaux
  if (findProjectById && entry.projectId) {
    return findProjectById(entry.projectId)?.name || entry.project || 'Projet inconnu';
  }

  return entry.project || 'Projet inconnu';
};