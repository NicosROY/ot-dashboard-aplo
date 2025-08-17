import React, { useState, useEffect } from 'react';
import supabaseService from '../../services/supabase';

interface Commune {
  id: number;
  name: string;
  population: number;
}

interface CommuneSelectionStepProps {
  data: Commune;
  onUpdate: (data: Commune) => void;
  onNext: () => void;
  onPrev: () => void;
}

const CommuneSelectionStep: React.FC<CommuneSelectionStepProps> = ({ 
  data, 
  onUpdate, 
  onNext, 
  onPrev 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [allCommunes, setAllCommunes] = useState<Commune[]>([]); // Toutes les communes pour la recherche
  const [filteredCommunes, setFilteredCommunes] = useState<Commune[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCommune, setSelectedCommune] = useState<Commune | null>(data.id ? data : null);

  // Charger les communes depuis Supabase
  const loadCommunes = async () => {
    setIsLoading(true);
    try {
      // Charger les 20 plus grandes villes pour l'affichage initial
      const { data: topCommunes, error: topError } = await supabaseService.getClient()
        .from('communes')
        .select('id, name, population')
        .not('population', 'is', null)
        .gt('population', 0)
        .order('population', { ascending: false })
        .limit(20);

      if (topError) throw topError;

      // Charger toutes les communes pour la recherche
      const { data: allCommunesData, error: allError } = await supabaseService.getClient()
        .from('communes')
        .select('id, name, population')
        .not('population', 'is', null)
        .order('population', { ascending: false });

      if (allError) throw allError;

      // Ajouter RaccoonCity manuellement pour les tests
      const raccoonCity = { id: 99999, name: 'RaccoonCity', population: -1234 };
      
      console.log('Top 20 communes chargées:', topCommunes);

      if (topCommunes && allCommunesData) {
        // Ajouter RaccoonCity aux données complètes pour la recherche
        const allCommunesWithTest = [raccoonCity, ...allCommunesData];
        
        setCommunes(topCommunes);
        setAllCommunes(allCommunesWithTest);
        setFilteredCommunes(topCommunes);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des communes:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCommunes();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      // Si pas de recherche, afficher les communes triées par population (plus grandes en premier)
      setFilteredCommunes(communes);
    } else {
      // Filtrer et trier par population décroissante
      const filtered = allCommunes
        .filter(commune =>
          commune.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => b.population - a.population); // Tri par population décroissante
      setFilteredCommunes(filtered);
    }
  }, [searchTerm, allCommunes]);

  const handleCommuneSelect = (commune: Commune) => {
    setSelectedCommune(commune);
    // Sauvegarder immédiatement quand on sélectionne une commune
    onUpdate(commune);
  };

  const handleContinue = () => {
    if (selectedCommune) {
      // Les données sont déjà sauvegardées dans handleCommuneSelect
      onNext();
    }
  };

  const getPopulationCategory = (population: number): string => {
    if (population < 10000) return 'Petite commune';
    if (population < 50000) return 'Commune moyenne';
    if (population < 200000) return 'Grande commune';
    return 'Très grande commune';
  };

  const getRecommendedPlan = (population: number): string => {
    if (population < 0) return 'Plan de test gratuit';
    if (population < 10000) return 'Petite commune (99€ HT/mois)';
    if (population < 100000) return 'Commune moyenne (199€ HT/mois)';
    return 'Grande commune (299€ HT/mois)';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Sélectionnez votre commune
        </h2>
        <p className="text-gray-600">
          Choisissez la commune pour laquelle vous gérez l'Office de Tourisme. 
          Cette sélection déterminera votre tarif d'abonnement.
        </p>
      </div>

      {/* Barre de recherche */}
      <div className="mb-6">
        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
          Rechercher une commune
        </label>
        <input
          type="text"
          id="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Nom de la commune..."
          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Message si aucune commune trouvée */}
      {searchTerm && filteredCommunes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Aucune commune trouvée
        </div>
      )}

      {/* Liste des communes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {(isLoading ? Array(6).fill(null) : filteredCommunes).map((commune, index) => (
          <div
            key={isLoading ? index : commune.id}
            onClick={() => !isLoading && handleCommuneSelect(commune)}
            className={`
              border rounded-md p-4 cursor-pointer transition-all duration-200
              ${isLoading ? 'animate-pulse bg-gray-100' : ''}
              ${selectedCommune?.id === commune?.id 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }
            `}
          >
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{commune.name}</h3>
                  <p className="text-sm text-gray-600 mb-1">
                    {commune.population ? commune.population.toLocaleString() : 'Population inconnue'} hab.
                  </p>
                  <p className="text-xs text-blue-600 font-medium">
                    {getPopulationCategory(commune.population || 0)}
                  </p>
                </div>
                {selectedCommune?.id === commune.id && (
                  <div className="flex-shrink-0 ml-4">
                    <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Commune sélectionnée */}
      {selectedCommune && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <div className="flex items-center mb-4">
            <svg className="h-6 w-6 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="text-lg font-semibold text-green-800">
              Commune sélectionnée : {selectedCommune.name}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Population :</span>
              <p className="text-gray-900">{selectedCommune.population ? selectedCommune.population.toLocaleString() : 'N/A'} habitants</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Votre tarif :</span>
              <p className="text-gray-900">{getRecommendedPlan(selectedCommune.population || 0)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Informations importantes */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-8">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Tarification selon la population
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Moins de 10 000 habitants :</strong> 99€ HT/mois</li>
                <li><strong>De 10 000 à 100 000 habitants :</strong> 199€ HT/mois</li>
                <li><strong>Plus de 100 000 habitants :</strong> 299€ HT/mois</li>
                <li>Résiliable à tout moment avec un préavis d'un mois</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Boutons de navigation */}
      <div className="flex justify-between">
        <button
          onClick={onPrev}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Retour
        </button>
        
        <button
          onClick={handleContinue}
          disabled={!selectedCommune}
          className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
            !selectedCommune
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-white text-aplo-purple border border-aplo-purple hover:bg-aplo-purple hover:text-white focus:outline-none focus:ring-2 focus:ring-aplo-purple focus:ring-offset-2'
          }`}
        >
          Continuer
        </button>
      </div>
    </div>
  );
};

export default CommuneSelectionStep; 