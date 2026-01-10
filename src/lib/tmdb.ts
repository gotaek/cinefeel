const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'; // w500 is a good size for web

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  poster_path: string | null;
  release_date: string;
  overview: string;
}

export const searchMovies = async (query: string): Promise<TMDBMovie[]> => {
  if (!TMDB_API_KEY) {
    console.error("❌ TMDB API Key is missing. Make sure NEXT_PUBLIC_TMDB_API_KEY is set in .env.local and restart the server.");
    return [];
  }

  try {
    const res = await fetch(
      `${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=ko-KR&query=${encodeURIComponent(query)}&page=1&include_adult=false`
    );
    
    if (!res.ok) {
        // Fallback for missing key or error
        console.error('TMDB API Error:', res.status, res.statusText);
        return [];
    }
    
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error('Failed to search TMDB', error);
    return [];
  }
};

export const getPosterUrl = (path: string | null) => {
  if (!path) return '';
  return `${IMAGE_BASE_URL}${path}`;
};
