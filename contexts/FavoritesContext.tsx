import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import type { FavoriteItem } from '../constants/types';
import { trpcClient } from '../lib/trpc';

interface CreateFavoritePayload {
  name: string;
  brand: string;
  price: number;
}

interface UpdateFavoritePayload {
  id: string;
  name?: string;
  brand?: string;
  price: number;
}

interface FavoritesResponse {
  favorites: FavoriteItem[];
}

interface FavoriteMutationResponse {
  favorite: FavoriteItem;
}

interface FavoritesContextShape {
  favorites: FavoriteItem[];
  isLoading: boolean;
  isAdding: boolean;
  isUpdating: boolean;
  isRemoving: boolean;
  addFavorite: (input: CreateFavoritePayload) => Promise<FavoriteItem>;
  updateFavorite: (input: UpdateFavoritePayload) => Promise<FavoriteItem>;
  removeFavorite: (favoriteId: string) => Promise<void>;
  refetchFavorites: () => Promise<FavoriteItem[]>;
}

export const [FavoritesProvider, useFavorites] = createContextHook<FavoritesContextShape>(() => {
  const queryClient = useQueryClient();

  const {
    data: favoritesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      console.log('[FavoritesContext] Fetching favorites');
      const response = await trpcClient.get<FavoritesResponse>('/api/favorites');
      return response.favorites;
    },
    staleTime: 1000 * 60,
  });

  const {
    mutateAsync: addFavoriteAsync,
    isPending: isAdding,
  } = useMutation({
    mutationFn: async (input: CreateFavoritePayload) => {
      console.log('[FavoritesContext] Adding favorite', input);
      const response = await trpcClient.post<FavoriteMutationResponse, CreateFavoritePayload>('/api/favorites', input);
      return response.favorite;
    },
    onSuccess: (favorite) => {
      queryClient.setQueryData<FavoriteItem[] | undefined>(['favorites'], (current) => {
        if (!current) {
          return [favorite];
        }
        return [favorite, ...current];
      });
    },
  });

  const {
    mutateAsync: updateFavoriteAsync,
    isPending: isUpdating,
  } = useMutation({
    mutationFn: async (input: UpdateFavoritePayload) => {
      console.log('[FavoritesContext] Updating favorite', input);
      const { id, ...updates } = input;
      const response = await trpcClient.patch<FavoriteMutationResponse, Partial<CreateFavoritePayload>>(`/api/favorites/${id}`, updates);
      return response.favorite;
    },
    onSuccess: (favorite) => {
      queryClient.setQueryData<FavoriteItem[] | undefined>(['favorites'], (current) => {
        if (!current) {
          return [favorite];
        }
        return current.map((item) => (item.id === favorite.id ? favorite : item));
      });
    },
  });

  const {
    mutateAsync: removeFavoriteAsync,
    isPending: isRemoving,
  } = useMutation({
    mutationFn: async (favoriteId: string) => {
      console.log('[FavoritesContext] Removing favorite', favoriteId);
      await trpcClient.delete<{ success: boolean }>(`/api/favorites/${favoriteId}`);
    },
    onSuccess: (_, favoriteId) => {
      queryClient.setQueryData<FavoriteItem[] | undefined>(['favorites'], (current) => {
        if (!current) {
          return [];
        }
        return current.filter((item) => item.id !== favoriteId);
      });
    },
  });

  const addFavorite = useCallback(
    async (input: CreateFavoritePayload) => addFavoriteAsync(input),
    [addFavoriteAsync],
  );

  const updateFavorite = useCallback(
    async (input: UpdateFavoritePayload) => updateFavoriteAsync(input),
    [updateFavoriteAsync],
  );

  const removeFavorite = useCallback(
    async (favoriteId: string) => removeFavoriteAsync(favoriteId),
    [removeFavoriteAsync],
  );

  const refetchFavorites = useCallback(async () => refetch().then((result) => result.data ?? []), [refetch]);

  return useMemo(() => ({
    favorites: favoritesData ?? [],
    isLoading,
    isAdding,
    isUpdating,
    isRemoving,
    addFavorite,
    updateFavorite,
    removeFavorite,
    refetchFavorites,
  }), [
    favoritesData,
    isLoading,
    isAdding,
    isUpdating,
    isRemoving,
    addFavorite,
    updateFavorite,
    removeFavorite,
    refetchFavorites,
  ]);
});
