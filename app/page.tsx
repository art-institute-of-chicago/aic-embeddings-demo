"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

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

// Wrapper component that uses searchParams
function ArtworkSearchContent() {
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
  const [isSharedLink, setIsSharedLink] = useState(false);

  const searchParams = useSearchParams();

  // Function to update URL with current search parameters
  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();
    
    params.set('type', queryType);
    
    if (queryType === 'semantic' && searchQuery) {
      params.set('q', searchQuery);
    }
    
    if ((queryType === 'nearest_neighbor' || queryType === 'similarity') && artworkId) {
      params.set('id', artworkId);
    }
    
    if (queryType === 'similarity' && compareId) {
      params.set('compareId', compareId);
    }
    
    if (apiUrl !== defaultApiUrl) {
      params.set('api', apiUrl);
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  }, [queryType, searchQuery, artworkId, compareId, apiUrl, defaultApiUrl]);

  // Define search function
  const handleSearch = useCallback(async (updateUrlFlag = true) => {
    setResults(null);
    setLoading(true);
    setError(null);
    setDebugUrl('');
    
    if (updateUrlFlag) {
      updateUrl();
    }
    
    try {
      // Always use the current state values
      const baseUrl = apiUrl.replace(/\/$/, '');
      let apiPath = '';

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
  }, [queryType, searchQuery, artworkId, compareId, apiUrl, updateUrl]);

  // Handle Enter key press in input fields
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(true);
    }
  };

  const handleCopyShareLink = () => {
    // Always update the URL before copying to ensure it reflects the current state
    updateUrl();
    
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        alert('Share link copied to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy link:', err);
        alert('Failed to copy link. Please copy the URL manually.');
      });
  };

  // Load parameters from URL only on initial render
  useEffect(() => {
    const type = searchParams.get('type') as QueryType;
    const query = searchParams.get('q');
    const id = searchParams.get('id');
    const compareIdParam = searchParams.get('compareId');
    const api = searchParams.get('api');
    
    // Check if this is a shared link by seeing if any search params exist
    const hasSearchParams = type || query || id || compareIdParam || api;
    setIsSharedLink(!!hasSearchParams);
    
    // Update state with URL parameters
    let stateUpdated = false;
    
    if (type && ['semantic', 'nearest_neighbor', 'similarity'].includes(type)) {
      setQueryType(type as QueryType);
      stateUpdated = true;
    }
    
    if (query) {
      setSearchQuery(query);
      stateUpdated = true;
    }
    
    if (id) {
      setArtworkId(id);
      stateUpdated = true;
    }
    
    if (compareIdParam) {
      setCompareId(compareIdParam);
      stateUpdated = true;
    }
    
    if (api) {
      setApiUrl(api);
      stateUpdated = true;
    }
    
    // Wait for state updates to complete before running search
    if (stateUpdated) {
      // Auto-run search if we have the necessary parameters
      const shouldRunSearch = 
        (type === 'semantic' && query) || 
        (type === 'nearest_neighbor' && id) || 
        (type === 'similarity' && id && compareIdParam);
        
      if (shouldRunSearch) {
        // Create a version of handleSearch that uses the URL parameters directly
        const runInitialSearch = async () => {
          setResults(null);
          setLoading(true);
          setError(null);
          
          try {
            const baseUrl = (api || defaultApiUrl).replace(/\/$/, '');
            let apiPath = '';

            switch (type) {
              case 'semantic':
                if (!query?.trim()) {
                  throw new Error('Search query is required');
                }
                apiPath = `/ai/v1/artworks/search?q=${encodeURIComponent(query.trim())}`;
                break;
              case 'nearest_neighbor':
                if (!id?.trim()) {
                  throw new Error('Artwork ID is required');
                }
                apiPath = `/ai/v1/artworks/${encodeURIComponent(id.trim())}/nearest?limit=30`;
                break;
              case 'similarity':
                if (!id?.trim() || !compareIdParam?.trim()) {
                  throw new Error('Both artwork IDs are required for similarity search');
                }
                apiPath = `/ai/v1/artworks/${encodeURIComponent(id.trim())}/similarity/${encodeURIComponent(compareIdParam.trim())}`;
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
        
        // Use a timeout to ensure state updates have completed
        setTimeout(runInitialSearch, 100);
      }
    }
  // Only run this effect once on mount - empty dependency array
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-white-900">Artwork Search</h1>
          {isSharedLink && (
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                Shared Search Loaded
              </div>
              <button 
                onClick={() => {
                  // Clear the URL but keep the current form values
                  window.history.pushState({}, '', window.location.pathname);
                  setIsSharedLink(false);
                }}
                className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded-full"
              >
                Clear URL
              </button>
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-900">API URL</label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            onKeyPress={handleKeyPress}
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
                  onKeyPress={handleKeyPress}
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
                  onKeyPress={handleKeyPress}
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
                  onKeyPress={handleKeyPress}
                  placeholder="Enter comparison artwork ID..."
                  className="w-full p-2 border rounded-lg text-gray-900"
                />
              </div>
            )}
          </div>

          <button
            onClick={() => handleSearch(true)}
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
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium mb-1 text-gray-900">Request URL:</p>
                <code className="text-sm break-all text-gray-900">{debugUrl}</code>
              </div>
              <button
                onClick={handleCopyShareLink}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center"
              >
                Copy Share Link
              </button>
            </div>
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
                            <Image
                              src={item.data.image_url}
                              alt={item.data.description?.slice(0, 100) || "Artwork image"}
                              className="w-full object-cover"
                              width={300}
                              height={225}
                              unoptimized
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

// Loading fallback for Suspense
function SearchLoading() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4 text-white-900">Artwork Search</h1>
        <div className="flex items-center justify-center h-40">
          <div className="text-lg">Loading search parameters...</div>
        </div>
      </div>
    </div>
  );
}

// Main component that wraps the content in Suspense
export default function Page() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <ArtworkSearchContent />
    </Suspense>
  );
}