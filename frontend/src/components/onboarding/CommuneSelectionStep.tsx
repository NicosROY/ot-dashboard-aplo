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

      console.log('Top 20 communes chargées:', topCommunes);

      if (topCommunes && allCommunesData) {
        setCommunes(topCommunes);
        setAllCommunes(allCommunesData);
        setFilteredCommunes(topCommunes);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des communes:', error);
      throw error; // Propager l'erreur au lieu d'utiliser des données factices
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
  };

  const handleContinue = () => {
    if (selectedCommune) {
      onUpdate(selectedCommune);
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
    return population < 10000 ? 'Petite commune (79€ HT/mois)' : 'Grande commune (149€ HT/mois)';
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
          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Liste des communes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {isLoading ? (
          <div className="col-span-2 text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des communes...</p>
          </div>
        ) : filteredCommunes.length === 0 ? (
          <div className="col-span-2 text-center py-8">
            <p className="text-gray-600">Aucune commune trouvée</p>
          </div>
        ) : (
          filteredCommunes.map((commune) => ( // Afficher toutes les communes filtrées
            <div
              key={commune.id}
              onClick={() => handleCommuneSelect(commune)}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedCommune?.id === commune.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{commune.name}</h3>
                  <p className="text-xs text-gray-500">ID: {commune.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {commune.population ? commune.population.toLocaleString() : 'N/A'} hab.
                  </p>
                  <p className="text-xs text-gray-500">
                    {getPopulationCategory(commune.population || 0)}
                  </p>
                </div>
              </div>
              
              {selectedCommune?.id === commune.id && (
                <div className="mt-3 p-3 bg-blue-100 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Plan recommandé :</strong> {getRecommendedPlan(commune.population || 0)}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
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
              <span className="font-medium text-gray-700">Plan recommandé :</span>
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
                <li><strong>Moins de 10 000 habitants :</strong> 79€ HT/mois</li>
                <li><strong>Plus de 10 000 habitants :</strong> 149€ HT/mois</li>
                <li>Période d'essai gratuite de 7 jours</li>
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
            className="btn btn-primary w-full"
          >
            Continuer
          </button>
      </div>
    </div>
  );
};

export default CommuneSelectionStep; 