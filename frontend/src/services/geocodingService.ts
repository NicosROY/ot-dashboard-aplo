// Service d'autocomplétion d'adresse avec OpenCage
// Limité à la France

interface OpenCageResult {
  geometry: {
    lat: number;
    lng: number;
  };
  formatted: string;
  components: {
    country: string;
    state?: string;
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
  };
}

interface OpenCageResponse {
  results: OpenCageResult[];
  status: {
    code: number;
    message: string;
  };
}

interface GeocodingResult {
  address: string;
  latitude: number;
  longitude: number;
  components?: {
    country: string;
    state?: string;
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
  };
}

class GeocodingService {
  private openCageUrl = 'https://api.opencagedata.com/geocode/v1';
  private apiKey = '9578b3c12dc144599d09c022ea42b362';

  // Recherche d'adresses avec autocomplétion
  async searchAddresses(query: string, communeName?: string): Promise<OpenCageResult[]> {
    try {
      // Construire la requête avec filtres France
      let searchQuery = query;
      if (communeName) {
        searchQuery += `, ${communeName}`;
      }
      searchQuery += ', France';

      console.log('🌐 Appel OpenCage:', searchQuery);

      const response = await fetch(
        `${this.openCageUrl}/json?` +
        `q=${encodeURIComponent(searchQuery)}` +
        `&countrycode=fr` +
        `&limit=5` +
        `&key=${this.apiKey}`
      );

      console.log('📡 Réponse OpenCage:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`Erreur OpenCage: ${response.status}`);
      }

      const data: OpenCageResponse = await response.json();
      console.log('📋 Résultats bruts:', data.results);
      
      // Filtrer pour s'assurer que c'est en France
      const filteredResults = data.results.filter(result => 
        result.components && result.components.country === 'France'
      );
      
      console.log('🇫🇷 Résultats filtrés France:', filteredResults);
      return filteredResults;
    } catch (error) {
      console.error('❌ Erreur lors de la recherche d\'adresses:', error);
      return [];
    }
  }

  // Géocoder une adresse complète
  async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    try {
      const response = await fetch(
        `${this.openCageUrl}/json?` +
        `q=${encodeURIComponent(address + ', France')}` +
        `&countrycode=fr` +
        `&limit=1` +
        `&key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Erreur OpenCage: ${response.status}`);
      }

      const data: OpenCageResponse = await response.json();
      
      if (data.results.length > 0) {
        const result = data.results[0];
        return {
          address: result.formatted,
          latitude: result.geometry.lat,
          longitude: result.geometry.lng,
          components: result.components
        };
      }

      return null;
    } catch (error) {
      console.error('Erreur lors du géocodage:', error);
      return null;
    }
  }

  // Calculer les coordonnées WKB (Well-Known Binary) pour PostGIS
  calculateWKB(latitude: number, longitude: number): string {
    // Format WKB pour un point en SRID 4326 (WGS84) compatible PostGIS
    const point = `SRID=4326;POINT(${longitude} ${latitude})`;
    return point;
  }
}

export default new GeocodingService(); 