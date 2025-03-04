"use client";

import { useState } from "react";
import { Search } from "lucide-react";

interface ArtworkItem {
  id: number;
  created_at: string;
  updated_at: string;
  version: string;
  model_name: string;
  model_id: number;
  data: {
    description: string;
    generated_at: string;
    image_url: string;
  };
  embedding: Record<string, unknown>;
  distance: string;
  embedding_type: string;
  image_embedding_data?: {
    description_generation_data: {
      analysis_data: {
        caption: string;
        denseCaption: Array<{
          text: string;
          confidence: number;
          boundingBox: {
            x: number;
            y: number;
            w: number;
            h: number;
          };
        }>;
        tags: Array<{
          name: string;
          confidence: number;
        }>;
        objects: Array<{
          boundingBox: {
            x: number;
            y: number;
            w: number;
            h: number;
          };
          tags: Array<{
            name: string;
            confidence: number;
          }>;
        }>;
        peopleLocation: Array<{
          boundingBox: {
            x: number;
            y: number;
            w: number;
            h: number;
          };
          confidence: number;
        }>;
      };
      aic_description: string | null;
    };
    description: string;
    generated_at: string;
    image_url: string;
  };
}

interface SimilarityScore {
  embedding_type: string;
  similarity_score: number;
  items: {
    id1: number;
    id2: number;
  };
}

interface SimilarityResults {
  similarity_scores: SimilarityScore[];
}

interface SearchResults {
  count: number;
  items: ArtworkItem[];
  model: string;
  id: null;
  total: number;
}

type QueryType = 'semantic' | 'nearest_neighbor' | 'similarity';

export default function Page() {
  const defaultApiUrl = 'https://api-test.artic.edu';
  const [apiUrl, setApiUrl] = useState(defaultApiUrl);
  const [queryType, setQueryType] = useState<QueryType>('semantic');
  const [searchQuery, setSearchQuery] = useState('');
  const [artworkId, setArtworkId] = useState('');
  const [compareId, setCompareId] = useState('');
  const [results, setResults] = useState<SearchResults | SimilarityResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugUrl, setDebugUrl] = useState<string>('');

  const handleSearch = async () => {
    setResults(null);
    setLoading(true);
    setError(null);
    setDebugUrl('');
    
    try {
      const baseUrl = (apiUrl || defaultApiUrl).replace(/\/$/, '');
      let apiPath: string;

      switch (queryType) {
        case 'semantic':
          if (!searchQuery.trim()) {
            throw new Error('Search query is required');
          }
          apiPath = `/ai/v1/artworks/search?q=${encodeURIComponent(searchQuery.trim())}`;
          break;
        case 'nearest_neighbor':
          if (!artworkId.trim()) {
            throw new Error('Artwork ID is required');
          }
          apiPath = `/ai/v1/artworks/${encodeURIComponent(artworkId.trim())}/nearest?limit=30`;
          break;
        case 'similarity':
          if (!artworkId.trim() || !compareId.trim()) {
            throw new Error('Both artwork IDs are required for similarity search');
          }
          apiPath = `/ai/v1/artworks/${encodeURIComponent(artworkId.trim())}/similarity/${encodeURIComponent(compareId.trim())}`;
          break;
        default:
          throw new Error('Invalid search type');
      }

      const url = `/api/artwork?path=${encodeURIComponent(apiPath)}`;
      setDebugUrl(`${baseUrl}${apiPath}`);
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Failed to fetch results');
      }

      setResults(data);
    } catch (err) {
      let errorMessage = 'Failed to fetch results';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4 text-white-900">Artwork Search</h1>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-900">API URL</label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder={defaultApiUrl}
            className="w-full p-2 border rounded-lg text-gray-900"
          />
        </div>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900">Search Type</label>
            <select 
              value={queryType}
              onChange={(e) => setQueryType(e.target.value as QueryType)}
              className="w-full p-2 border rounded-lg text-gray-900"
            >
              <option value="semantic">Semantic Search</option>
              <option value="nearest_neighbor">Nearest Neighbor</option>
              <option value="similarity">Similarity Search</option>
            </select>
          </div>

          <div className="space-y-4">
            {queryType === 'semantic' && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900">Search Query</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter search terms..."
                  className="w-full p-2 border rounded-lg text-gray-900"
                />
              </div>
            )}

            {(queryType === 'nearest_neighbor' || queryType === 'similarity') && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900">Artwork ID</label>
                <input
                  type="text"
                  value={artworkId}
                  onChange={(e) => setArtworkId(e.target.value)}
                  placeholder="Enter artwork ID..."
                  className="w-full p-2 border rounded-lg text-gray-900"
                />
              </div>
            )}

            {queryType === 'similarity' && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900">Compare Artwork ID</label>
                <input
                  type="text"
                  value={compareId}
                  onChange={(e) => setCompareId(e.target.value)}
                  placeholder="Enter comparison artwork ID..."
                  className="w-full p-2 border rounded-lg text-gray-900"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center justify-center w-full p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? (
              'Searching...'
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search
              </>
            )}
          </button>
        </div>

        {debugUrl && (
          <div className="mb-4 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm font-medium mb-1 text-gray-900">Request URL:</p>
            <code className="text-sm break-all text-gray-900">{debugUrl}</code>
          </div>
        )}

        {error && (
          <div className="text-red-600 p-4 rounded-lg bg-red-50 mb-4">
            {error}
          </div>
        )}

        {results && (
          <div className="space-y-6">
            {'items' in results ? (
              <>
                <div className="text-sm text-gray-900">
                  Found {results.count} results
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.items?.map((item) => (
                    <div key={item.id} className="border rounded-lg overflow-hidden bg-white">
                      <div className="p-4">
                        {item.data?.image_url && (
                          <div className="aspect-w-4 aspect-h-3 w-full">
                            <img
                              src={item.data.image_url}
                              alt={item.data.description?.slice(0, 100) || "Artwork image"}
                              className="w-full h-64 object-cover"
                            />
                          </div>
                        )}
                        <div className="text-sm mb-2 text-gray-900 pt-2">
                          <a href={`https://artic.edu/artworks/${item.model_id}`}>ID: {item.model_id}</a>
                        </div>
                        {item.data.description && (
                          <p className="text-sm mb-4 text-gray-900">
                            <b>Description:</b> {item.data.description}
                          </p>
                        )}
                        {item.distance && (
                          <div className="text-sm text-blue-600">
                            Distance: {parseFloat(item.distance).toFixed(4)}
                          </div>
                        )}
                        {item.embedding_type && (
                          <div className="text-sm text-gray-900">
                            Type: {item.embedding_type}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Similarity Scores</h2>
                {results.similarity_scores.map((score, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-medium text-gray-900">
                        Type: {score.embedding_type}
                      </div>
                      <div className="text-sm text-blue-600">
                        Score: {score.similarity_score.toFixed(4)}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      Artwork IDs: {score.items.id1} ↔ {score.items.id2}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}