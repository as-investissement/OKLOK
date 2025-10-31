// Helper TypeScript pour la gestion des semaines avec timezone Europe/Paris

const tz = "Europe/Paris";

/**
 * Obtient la plage de dates d'une semaine (lundi 00:00 à dimanche 23:59:59)
 * @param date - Date de référence (par défaut: maintenant)
 * @returns Objet avec start (lundi 00:00) et end (dimanche 23:59:59) en ISO
 */
export function getWeekRange(date: Date = new Date()): { start: string; end: string } {
  // Créer une date en timezone Europe/Paris
  const parisDate = new Date(date.toLocaleString("en-US", { timeZone: tz }));
  
  // Obtenir le jour de la semaine (0 = dimanche, 1 = lundi, ..., 6 = samedi)
  const dayOfWeek = parisDate.getDay();
  
  // Calculer le nombre de jours depuis lundi (1 = lundi)
  // Si dimanche (0), c'est 6 jours depuis lundi
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  // Calculer le lundi de cette semaine à 00:00:00
  const monday = new Date(parisDate);
  monday.setDate(parisDate.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);
  
  // Calculer le dimanche de cette semaine à 23:59:59
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6); // Dimanche = lundi + 6 jours
  sunday.setHours(23, 59, 59, 999);
  
  return {
    start: monday.toISOString(),
    end: sunday.toISOString()
  };
}

/**
 * Jours de la semaine requis pour le travail
 * 1 = lundi, 2 = mardi, 3 = mercredi, 4 = jeudi, 5 = vendredi, 6 = samedi, 7 = dimanche
 */
export const weekdaysRequired = [1, 2, 3, 4, 5]; // Lundi à vendredi

/**
 * Timezone utilisée pour les calculs
 */
export { tz };

/**
 * Vérifie si un jour de la semaine est un jour ouvré
 * @param dayOfWeek - Jour de la semaine (1 = lundi, 7 = dimanche)
 * @returns true si c'est un jour ouvré
 */
export function isWorkingDay(dayOfWeek: number): boolean {
  return weekdaysRequired.includes(dayOfWeek);
}

/**
 * Convertit un jour JavaScript (0 = dimanche) en jour ISO (1 = lundi)
 * @param jsDay - Jour JavaScript (0-6)
 * @returns Jour ISO (1-7)
 */
export function jsToIsoDay(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * Obtient le numéro du jour de la semaine en format ISO pour une date
 * @param date - Date à analyser
 * @returns Numéro du jour (1 = lundi, 7 = dimanche)
 */
export function getIsoDayOfWeek(date: Date): number {
  const parisDate = new Date(date.toLocaleString("en-US", { timeZone: tz }));
  return jsToIsoDay(parisDate.getDay());
}