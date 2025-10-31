import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, FileText, Shield, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CGU: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/')}
          className="mr-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-blue-600 transition-colors duration-200 group"
        >
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">CGU et Confidentialité</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Conditions générales d'utilisation et politique de confidentialité
          </p>
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Conditions Générales d'Utilisation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-200">
          <div className="flex items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              📘 Conditions Générales d'Utilisation (CGU)
            </h2>
          </div>
          
          <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">1. Objet</h3>
              <p className="mb-4 text-justify text-gray-900 dark:text-gray-100">
                Les présentes CGU encadrent l'utilisation de l'application AS INVESTISSEMENT par les salariés. En accédant à l'application, l'utilisateur salarié déclare accepter les présentes conditions ainsi que la politique de confidentialité ci-dessous.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">2. Présentation de l'éditeur</h3>
              <p className="mb-4 text-justify text-gray-900 dark:text-gray-100">
                L'application est éditée par AS INVESTISSEMENT, société holding immatriculée au RCS de Bobigny sous le numéro 391664430, dont le siège est situé au 72 avenue du Chalet – 93360 Neuilly-Plaisance. Elle est mise à disposition des salariés d'AS INVESTISSEMENT et des sociétés de son groupe (NUMELEC, BBSE, QUADRO CAB et JLCR), toutes ayant le même siège social. Contact : <a href="mailto:contact@as-numelec.fr" className="text-blue-600 dark:text-blue-400 hover:underline">contact@as-numelec.fr</a>.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">3. Accès et utilisation</h3>
              <p className="mb-4 text-justify text-gray-900 dark:text-gray-100">
                L'accès à l'application est réservé aux salariés autorisés des sociétés mentionnées ci-dessus. Toute utilisation doit respecter la loi, le contrat de travail et les règles internes de l'entreprise.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">4. Responsabilité</h3>
              <p className="mb-4 text-justify text-gray-900 dark:text-gray-100">
                L'éditeur s'efforce de garantir la fiabilité des informations diffusées via l'application mais ne peut assurer l'absence totale d'erreurs et décline toute responsabilité quant aux dommages indirects liés à son utilisation.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">5. Propriété intellectuelle</h3>
              <p className="mb-4 text-justify text-gray-900 dark:text-gray-100">
                L'ensemble des contenus et données présents dans l'application est protégé par les lois en vigueur. Toute reproduction, diffusion ou exploitation sans autorisation préalable est interdite.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">6. Modification</h3>
              <p className="mb-4 text-justify text-gray-900 dark:text-gray-100">
                L'éditeur se réserve le droit de modifier ou mettre à jour les présentes CGU et la politique de confidentialité. La version applicable est celle en vigueur au moment de l'utilisation.
              </p>
            </div>
          </div>
        </div>

        {/* Politique de Confidentialité */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-200">
          <div className="flex items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              🔒 Politique de Confidentialité (Protection des données – RGPD)
            </h2>
          </div>
          
          <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">1. Responsables du traitement</h3>
              <p className="mb-4 text-justify text-gray-900 dark:text-gray-100">
                Les responsables du traitement sont AS INVESTISSEMENT, NUMELEC, BBSE, QUADRO CAB et JLCR, agissant en qualité de responsables conjoints. Le DPO désigné est MOSLAH Ahlem, joignable au 01 43 08 34 22 ou <a href="mailto:contact@as-numelec.fr" className="text-blue-600 dark:text-blue-400 hover:underline">contact@as-numelec.fr</a>.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">2. Finalités</h3>
              <p className="mb-4 text-justify text-gray-900 dark:text-gray-100">
                Les données collectées servent exclusivement à la gestion administrative et RH, l'établissement des fiches de paie, le suivi des heures de travail et le respect des obligations légales.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">3. Base légale</h3>
              <p className="mb-4 text-justify text-gray-900 dark:text-gray-100">
                Le traitement repose sur l'exécution du contrat de travail et le respect des obligations légales de l'employeur.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">4. Données collectées</h3>
              <p className="mb-4 text-justify text-gray-900 dark:text-gray-100">
                Nom, prénom, date de naissance, date d'embauche, heures de travail enregistrées, ainsi que, le cas échéant, d'autres données nécessaires à la paie et à la gestion RH (ex. RIB, numéro de sécurité sociale).
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">5. Destinataires</h3>
              <p className="mb-4 text-justify text-gray-900 dark:text-gray-100">
                Accès réservé au gérant, assistantes de direction, conducteurs de travaux si nécessaire, services paie/comptabilité/RH et prestataires externes habilités (ex. cabinet comptable, logiciel de paie), tous soumis à confidentialité.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">6. Conservation</h3>
              <p className="mb-4 text-justify text-gray-900 dark:text-gray-100">
                Les données sont conservées pendant 5 ans, sauf obligations légales imposant un délai plus long (ex. 10 ans pour pièces comptables).
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">7. Droits des salariés</h3>
              <p className="mb-4 text-justify text-gray-900 dark:text-gray-100">
                Chaque salarié dispose des droits d'accès, rectification, effacement, limitation, opposition et portabilité, ainsi que du droit de définir le sort de ses données après son décès. Réclamations possibles auprès de la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">www.cnil.fr</a>).
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">8. Exercice des droits</h3>
              <p className="mb-4 text-justify text-gray-900 dark:text-gray-100">
                Demandes à adresser au Service Paie/Comptabilité/RH par e-mail (<a href="mailto:contact@as-numelec.fr" className="text-blue-600 dark:text-blue-400 hover:underline">contact@as-numelec.fr</a>) ou courrier (72 avenue du Chalet – 93360 Neuilly-Plaisance). Réponse sous un mois, prolongeable à trois mois.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">9. Transferts hors UE</h3>
              <p className="mb-4 text-justify text-gray-900 dark:text-gray-100">
                Aucun transfert hors UE n'est effectué. En cas de recours à un prestataire externe situé hors UE, des garanties conformes au RGPD seront appliquées.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">10. Sécurité</h3>
              <p className="mb-4 text-justify text-gray-900 dark:text-gray-100">
                Mesures techniques et organisationnelles mises en place : chiffrement des accès, gestion stricte des habilitations, sauvegardes régulières et règles de confidentialité afin de garantir l'intégrité et la protection des données.
              </p>
            </div>
          </div>
        </div>

        {/* Contact et informations */}
        <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4 transition-colors duration-200">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Contact pour vos droits
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p className="text-justify text-blue-800 dark:text-blue-100">
                  Pour exercer vos droits ou pour toute question concernant le traitement de vos données personnelles,
                  contactez le DPO MOSLAH Ahlem au 01 43 08 34 22 ou par e-mail à <a href="mailto:contact@as-numelec.fr" className="text-blue-600 dark:text-blue-400 hover:underline">contact@as-numelec.fr</a>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Date de dernière mise à jour */}
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CGU;