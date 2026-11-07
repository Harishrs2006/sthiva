'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClientError, isAbortError, type ApiClient } from '../api/client';
import { productListSchema, type ProductList } from '../api/schemas';
import { useApiClient } from '../context';
import { useSelectedLocation } from '../location/hooks';

export type ProductQuery = {
  category?: string;
  q?: string;
  page?: number;
  limit?: number;
  // 'nearby' (default with a PIN): suppliers nearest the site first
  sort?: 'nearby' | 'popular' | 'price_asc' | 'price_desc' | 'newest';
  // Only listings with the seller's own photos (the Catalogue)
  withPhotos?: boolean;
};

/**
 * GET /products — note this endpoint returns bare JSON (no { success, data } envelope).
 * With a PIN, only products from suppliers delivering there come back, plus `location`.
 */
export async function fetchProducts(
  client: ApiClient,
  params: ProductQuery & { pincode?: string | null },
  signal?: AbortSignal
): Promise<ProductList> {
  const { pincode, ...rest } = params;
  const list = await client.request('/products', {
    query: { ...rest, withPhotos: rest.withPhotos ? 1 : undefined, pincode: pincode ?? undefined },
    schema: productListSchema,
    envelope: false,
    signal,
  });
  if (pincode && list.location?.pincode !== pincode) {
    throw new ApiClientError('Unexpected response from Sthiva', 'INVALID_RESPONSE', 200);
  }
  return list;
}

export type ProductsState =
  | { status: 'loading'; pincode: string | null; data?: undefined }
  | { status: 'success'; pincode: string | null; data: ProductList }
  | { status: 'error'; pincode: string | null; error: ApiClientError | Error; data?: undefined };

/**
 * Products for the buyer's selected PIN (or the unfiltered catalogue when none is chosen).
 * Changing the PIN or query aborts the previous request; a late answer for an old PIN is
 * discarded and never replaces results for the current one. Results always carry the PIN
 * they were fetched for.
 */
export function useProductsForLocation(query: ProductQuery = {}, options: { pincode?: string | null } = {}) {
  const client = useApiClient();
  const selected = useSelectedLocation();
  const pincode = options.pincode !== undefined ? options.pincode : selected?.pincode ?? null;
  const { category, q, page, limit, sort, withPhotos } = query;
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<ProductsState>({ status: 'loading', pincode });
  const latest = useRef(0);

  useEffect(() => {
    const id = ++latest.current;
    const controller = new AbortController();
    // Never show the previous PIN's products under the new PIN
    setState({ status: 'loading', pincode });
    fetchProducts(client, { pincode, category, q, page, limit, sort, withPhotos }, controller.signal)
      .then((data) => {
        if (id !== latest.current) return;
        setState({ status: 'success', pincode, data });
      })
      .catch((err) => {
        if (id !== latest.current || isAbortError(err)) return;
        setState({ status: 'error', pincode, error: err });
      });
    return () => controller.abort();
  }, [client, pincode, category, q, page, limit, sort, withPhotos, nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, refetch };
}
