import { useState, useCallback } from 'react';
import { logger } from '../services/logger';

interface AsyncState<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
}

export function useAsync<T, Args extends any[]>(
    asyncFunction: (...args: Args) => Promise<T>,
    immediate = false
) {
    const [state, setState] = useState<AsyncState<T>>({
        data: null,
        loading: immediate,
        error: null,
    });

    const execute = useCallback(
        async (...args: Args) => {
            setState({ data: null, loading: true, error: null });
            try {
                const response = await asyncFunction(...args);
                setState({ data: response, loading: false, error: null });
                return response;
            } catch (error: any) {
                logger.error('Async hook execution failed', error);
                setState({ data: null, loading: false, error });
                throw error;
            }
        },
        [asyncFunction]
    );

    return { execute, ...state };
}
